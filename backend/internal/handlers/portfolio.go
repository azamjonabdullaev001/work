package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"freelance-platform/internal/models"

	"github.com/go-chi/chi/v5"
)

type PortfolioHandler struct {
	DB *sql.DB
}

func (h *PortfolioHandler) GetMyPortfolio(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	rows, err := h.DB.Query(`
		SELECT id, user_id, title, description, image_url, project_url, 
		       project_zip_url, project_tree, has_index, is_featured, created_at
		FROM portfolio WHERE user_id = $1
		ORDER BY is_featured DESC, created_at DESC
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var items []models.PortfolioItem
	for rows.Next() {
		var p models.PortfolioItem
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Description, &p.ImageURL, &p.ProjectURL,
			&p.ProjectZipURL, &p.ProjectTree, &p.HasIndex, &p.IsFeatured, &p.CreatedAt); err == nil {
			items = append(items, p)
		}
	}

	if items == nil {
		items = []models.PortfolioItem{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    items,
	})
}

func (h *PortfolioHandler) CreatePortfolioItem(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	r.ParseMultipartForm(10 << 20) // 10 MB max (for image only)

	title := r.FormValue("title")
	if title == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Title is required",
		})
		return
	}

	description := r.FormValue("description")
	projectURL := r.FormValue("project_url")
	githubURL := r.FormValue("github_url")
	isFeatured := r.FormValue("is_featured") == "true"

	// Validate github_url if provided
	if githubURL != "" && !strings.HasPrefix(githubURL, "https://github.com/") {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid GitHub URL. Must start with https://github.com/",
		})
		return
	}

	var imageURL *string
	var githubURLPtr *string

	// Handle image upload
	file, header, err := r.FormFile("image")
	if err == nil {
		defer file.Close()

		ext := strings.ToLower(filepath.Ext(header.Filename))
		allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
		if !allowedExts[ext] {
			writeJSON(w, http.StatusBadRequest, models.APIResponse{
				Success: false, Error: "Only image files are allowed",
			})
			return
		}

		filename := fmt.Sprintf("portfolio_%d_%d%s", userID, time.Now().UnixNano(), ext)
		filePath := filepath.Join("uploads", filename)

		dst, err := os.Create(filePath)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, models.APIResponse{
				Success: false, Error: "Failed to save image",
			})
			return
		}
		defer dst.Close()
		io.Copy(dst, file)

		url := "/uploads/" + filename
		imageURL = &url
	}

	if githubURL != "" {
		githubURLPtr = &githubURL
	}

	// If featured, unset other featured items
	if isFeatured {
		h.DB.Exec("UPDATE portfolio SET is_featured = false WHERE user_id = $1", userID)
	}

	var descPtr, projPtr *string
	if description != "" {
		descPtr = &description
	}
	if projectURL != "" {
		projPtr = &projectURL
	}

	var item models.PortfolioItem
	err = h.DB.QueryRow(`
		INSERT INTO portfolio (user_id, title, description, image_url, project_url,
		                       project_zip_url, project_tree, has_index, is_featured)
		VALUES ($1, $2, $3, $4, $5, $6, NULL, false, $7)
		RETURNING id, user_id, title, description, image_url, project_url,
		          project_zip_url, project_tree, has_index, is_featured, created_at
	`, userID, title, descPtr, imageURL, projPtr, githubURLPtr, isFeatured).Scan(
		&item.ID, &item.UserID, &item.Title, &item.Description, &item.ImageURL, &item.ProjectURL,
		&item.ProjectZipURL, &item.ProjectTree, &item.HasIndex, &item.IsFeatured, &item.CreatedAt,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to create portfolio item",
		})
		return
	}

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    item,
		Message: "Portfolio item created",
	})
}

func (h *PortfolioHandler) UpdatePortfolioItem(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid portfolio item ID",
		})
		return
	}

	var req models.CreatePortfolioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid request body",
		})
		return
	}

	if req.IsFeatured {
		h.DB.Exec("UPDATE portfolio SET is_featured = false WHERE user_id = $1", userID)
	}

	result, err := h.DB.Exec(`
		UPDATE portfolio SET title = $1, description = $2, project_url = $3, is_featured = $4
		WHERE id = $5 AND user_id = $6
	`, req.Title, req.Description, req.ProjectURL, req.IsFeatured, itemID, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to update portfolio item",
		})
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Error: "Portfolio item not found",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Portfolio item updated",
	})
}

func (h *PortfolioHandler) DeletePortfolioItem(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid portfolio item ID",
		})
		return
	}

	result, err := h.DB.Exec("DELETE FROM portfolio WHERE id = $1 AND user_id = $2", itemID, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to delete portfolio item",
		})
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Error: "Portfolio item not found",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Portfolio item deleted",
	})
}

// GetPortfolioItem returns a single portfolio item (public)
func (h *PortfolioHandler) GetPortfolioItem(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid portfolio item ID",
		})
		return
	}

	var p models.PortfolioItem
	err = h.DB.QueryRow(`
		SELECT id, user_id, title, description, image_url, project_url,
		       project_zip_url, project_tree, has_index, is_featured, created_at
		FROM portfolio WHERE id = $1
	`, itemID).Scan(&p.ID, &p.UserID, &p.Title, &p.Description, &p.ImageURL, &p.ProjectURL,
		&p.ProjectZipURL, &p.ProjectTree, &p.HasIndex, &p.IsFeatured, &p.CreatedAt)
	if err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Error: "Portfolio item not found",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    p,
	})
}

// GetUserPortfolio returns portfolio items for any user (public)
func (h *PortfolioHandler) GetUserPortfolio(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid user ID",
		})
		return
	}

	rows, err := h.DB.Query(`
		SELECT id, user_id, title, description, image_url, project_url,
		       project_zip_url, project_tree, has_index, is_featured, created_at
		FROM portfolio WHERE user_id = $1
		ORDER BY is_featured DESC, created_at DESC
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var items []models.PortfolioItem
	for rows.Next() {
		var p models.PortfolioItem
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Description, &p.ImageURL, &p.ProjectURL,
			&p.ProjectZipURL, &p.ProjectTree, &p.HasIndex, &p.IsFeatured, &p.CreatedAt); err == nil {
			items = append(items, p)
		}
	}
	if items == nil {
		items = []models.PortfolioItem{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    items,
	})
}

// PreviewProjectFile — redirects to the GitHub repository URL
func (h *PortfolioHandler) PreviewProjectFile(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var githubURL *string
	err = h.DB.QueryRow("SELECT project_zip_url FROM portfolio WHERE id = $1", itemID).Scan(&githubURL)
	if err != nil || githubURL == nil {
		http.Error(w, "Project not found", http.StatusNotFound)
		return
	}

	http.Redirect(w, r, *githubURL, http.StatusFound)
}

// DownloadProject — redirects to the GitHub repository URL
func (h *PortfolioHandler) DownloadProject(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var githubURL *string
	err = h.DB.QueryRow("SELECT project_zip_url FROM portfolio WHERE id = $1", itemID).Scan(&githubURL)
	if err != nil || githubURL == nil {
		http.Error(w, "Project not found", http.StatusNotFound)
		return
	}

	http.Redirect(w, r, *githubURL, http.StatusFound)
}
