package handlers

import (
	"archive/zip"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
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

	r.ParseMultipartForm(50 << 20) // 50 MB max

	title := r.FormValue("title")
	if title == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Title is required",
		})
		return
	}

	description := r.FormValue("description")
	projectURL := r.FormValue("project_url")
	isFeatured := r.FormValue("is_featured") == "true"

	var imageURL *string
	var projectZipURL *string
	var projectTreeJSON *json.RawMessage
	hasIndex := false

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

	// Handle ZIP project upload
	zipFile, zipHeader, err := r.FormFile("project_zip")
	if err == nil {
		defer zipFile.Close()

		ext := strings.ToLower(filepath.Ext(zipHeader.Filename))
		if ext != ".zip" {
			writeJSON(w, http.StatusBadRequest, models.APIResponse{
				Success: false, Error: "Only .zip files are allowed for projects",
			})
			return
		}

		// Save ZIP
		zipFilename := fmt.Sprintf("project_%d_%d.zip", userID, time.Now().UnixNano())
		zipPath := filepath.Join("uploads", zipFilename)

		dst, err := os.Create(zipPath)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, models.APIResponse{
				Success: false, Error: "Failed to save project file",
			})
			return
		}
		defer dst.Close()
		io.Copy(dst, zipFile)

		zipURL := "/uploads/" + zipFilename
		projectZipURL = &zipURL

		// Extract ZIP to a project folder
		projectDir := fmt.Sprintf("project_%d_%d", userID, time.Now().UnixNano())
		extractPath := filepath.Join("uploads", "projects", projectDir)
		os.MkdirAll(extractPath, 0755)

		if err := extractZipSafe(zipPath, extractPath); err != nil {
			os.RemoveAll(extractPath)
			writeJSON(w, http.StatusBadRequest, models.APIResponse{
				Success: false, Error: "Failed to extract ZIP: " + err.Error(),
			})
			return
		}

		// Build file tree
		tree := buildFileTree(extractPath, extractPath)
		treeBytes, _ := json.Marshal(tree)
		raw := json.RawMessage(treeBytes)
		projectTreeJSON = &raw

		// Check for index.html
		if _, err := os.Stat(filepath.Join(extractPath, "index.html")); err == nil {
			hasIndex = true
		}

		// Update the zipURL to point to extracted folder for preview
		extractURL := "/uploads/projects/" + projectDir
		projectZipURL = &extractURL
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
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, user_id, title, description, image_url, project_url, 
		          project_zip_url, project_tree, has_index, is_featured, created_at
	`, userID, title, descPtr, imageURL, projPtr, projectZipURL, projectTreeJSON, hasIndex, isFeatured).Scan(
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

// PreviewProjectFile serves a file from an extracted project for iframe preview
func (h *PortfolioHandler) PreviewProjectFile(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var projectZipURL *string
	err = h.DB.QueryRow("SELECT project_zip_url FROM portfolio WHERE id = $1", itemID).Scan(&projectZipURL)
	if err != nil || projectZipURL == nil {
		http.Error(w, "Project not found", http.StatusNotFound)
		return
	}

	filePath := chi.URLParam(r, "*")
	if filePath == "" {
		filePath = "index.html"
	}

	// project_zip_url stores the extracted directory path like /uploads/projects/project_1_xxx
	baseDir := "." + *projectZipURL
	fullPath := filepath.Join(baseDir, filepath.FromSlash(filePath))

	// Security: prevent path traversal
	absBase, _ := filepath.Abs(baseDir)
	absTarget, _ := filepath.Abs(fullPath)
	if !strings.HasPrefix(absTarget, absBase) {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// CSP headers for sandboxed preview
	w.Header().Set("Content-Security-Policy",
		"default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; "+
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'; "+
			"style-src 'self' 'unsafe-inline'; "+
			"img-src 'self' data: blob:; "+
			"font-src 'self' data:; "+
			"connect-src 'none'")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	http.ServeFile(w, r, fullPath)
}

// DownloadProject creates and sends a ZIP of the project folder
func (h *PortfolioHandler) DownloadProject(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var projectZipURL *string
	var title string
	err = h.DB.QueryRow("SELECT project_zip_url, title FROM portfolio WHERE id = $1", itemID).Scan(&projectZipURL, &title)
	if err != nil || projectZipURL == nil {
		http.Error(w, "Project not found", http.StatusNotFound)
		return
	}

	baseDir := "." + *projectZipURL
	if _, err := os.Stat(baseDir); os.IsNotExist(err) {
		http.Error(w, "Project files not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.zip"`, title))

	zw := zip.NewWriter(w)
	defer zw.Close()

	filepath.Walk(baseDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		rel, _ := filepath.Rel(baseDir, path)
		header, _ := zip.FileInfoHeader(info)
		header.Name = filepath.ToSlash(rel)
		header.Method = zip.Deflate
		writer, err := zw.CreateHeader(header)
		if err != nil {
			return err
		}
		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()
		io.Copy(writer, f)
		return nil
	})
}

// ── ZIP extraction helpers ──────────────────────────────────────

func extractZipSafe(zipPath, destDir string) error {
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return fmt.Errorf("invalid ZIP file")
	}
	defer reader.Close()

	if len(reader.File) > 5000 {
		return fmt.Errorf("ZIP contains too many files")
	}

	// Check for single root directory wrapper
	hasSingleRoot := true
	var rootName string
	for _, f := range reader.File {
		parts := strings.SplitN(f.Name, "/", 2)
		if rootName == "" {
			rootName = parts[0]
		} else if parts[0] != rootName {
			hasSingleRoot = false
			break
		}
	}

	for _, f := range reader.File {
		name := f.Name
		if strings.Contains(name, "..") {
			return fmt.Errorf("invalid file paths in ZIP")
		}

		// Strip single root wrapper
		if hasSingleRoot && rootName != "" {
			name = strings.TrimPrefix(name, rootName+"/")
			if name == "" {
				continue
			}
		}

		targetPath := filepath.Join(destDir, filepath.FromSlash(name))

		// Security: path traversal check
		absTarget, _ := filepath.Abs(targetPath)
		absDest, _ := filepath.Abs(destDir)
		if !strings.HasPrefix(absTarget, absDest) {
			return fmt.Errorf("path traversal detected")
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(targetPath, 0755)
			continue
		}

		os.MkdirAll(filepath.Dir(targetPath), 0755)

		outFile, err := os.Create(targetPath)
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		// Limit individual file size to 50MB
		_, err = io.Copy(outFile, io.LimitReader(rc, 50<<20))
		rc.Close()
		outFile.Close()
		if err != nil {
			return err
		}
	}

	return nil
}

type fileTreeNode struct {
	Name     string         `json:"name"`
	Path     string         `json:"path"`
	Type     string         `json:"type"`
	Size     int64          `json:"size,omitempty"`
	Children []fileTreeNode `json:"children,omitempty"`
}

func buildFileTree(dir, baseDir string) []fileTreeNode {
	var tree []fileTreeNode

	entries, err := os.ReadDir(dir)
	if err != nil {
		return tree
	}

	// Sort: dirs first, then files
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].IsDir() != entries[j].IsDir() {
			return entries[i].IsDir()
		}
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})

	for _, entry := range entries {
		fullPath := filepath.Join(dir, entry.Name())
		relPath, _ := filepath.Rel(baseDir, fullPath)
		relPath = filepath.ToSlash(relPath)

		if entry.IsDir() {
			node := fileTreeNode{
				Name:     entry.Name(),
				Path:     relPath,
				Type:     "directory",
				Children: buildFileTree(fullPath, baseDir),
			}
			tree = append(tree, node)
		} else {
			info, _ := entry.Info()
			size := int64(0)
			if info != nil {
				size = info.Size()
			}
			tree = append(tree, fileTreeNode{
				Name: entry.Name(),
				Path: relPath,
				Type: "file",
				Size: size,
			})
		}
	}

	return tree
}
