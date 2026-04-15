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

type ProfileHandler struct {
	DB *sql.DB
}

func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid user ID",
		})
		return
	}

	var user models.User
	err = h.DB.QueryRow(`
		SELECT id, first_name, last_name, patronymic, pinfl, phone, avatar_url, role, title, bio, hourly_rate, location, created_at, updated_at
		FROM users WHERE id = $1
	`, userID).Scan(
		&user.ID, &user.FirstName, &user.LastName, &user.Patronymic, &user.PINFL, &user.Phone,
		&user.AvatarURL, &user.Role, &user.Title, &user.Bio, &user.HourlyRate,
		&user.Location, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Error: "User not found",
		})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}

	user.Skills = getUserSkills(h.DB, user.ID)

	// Get portfolio
	rows, err := h.DB.Query(`
		SELECT id, user_id, title, description, image_url, project_url, is_featured, created_at
		FROM portfolio WHERE user_id = $1 ORDER BY is_featured DESC, created_at DESC
	`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p models.PortfolioItem
			if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Description, &p.ImageURL, &p.ProjectURL, &p.IsFeatured, &p.CreatedAt); err == nil {
				user.Portfolio = append(user.Portfolio, p)
			}
		}
	}

	// Get rating
	var avgRating sql.NullFloat64
	var reviewCount int
	h.DB.QueryRow(`SELECT COALESCE(AVG(rating), 0), COUNT(*) FROM reviews WHERE reviewee_id = $1`, userID).Scan(&avgRating, &reviewCount)
	if avgRating.Valid {
		r := avgRating.Float64
		user.Rating = &r
	}
	user.Reviews = reviewCount

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    user,
	})
}

func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	var req models.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid request body",
		})
		return
	}

	// Build dynamic update query
	setClauses := []string{}
	args := []interface{}{}
	argIdx := 1

	if req.FirstName != nil {
		setClauses = append(setClauses, fmt.Sprintf("first_name = $%d", argIdx))
		args = append(args, *req.FirstName)
		argIdx++
	}
	if req.LastName != nil {
		setClauses = append(setClauses, fmt.Sprintf("last_name = $%d", argIdx))
		args = append(args, *req.LastName)
		argIdx++
	}
	if req.Patronymic != nil {
		setClauses = append(setClauses, fmt.Sprintf("patronymic = $%d", argIdx))
		args = append(args, *req.Patronymic)
		argIdx++
	}
	if req.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *req.Title)
		argIdx++
	}
	if req.Bio != nil {
		setClauses = append(setClauses, fmt.Sprintf("bio = $%d", argIdx))
		args = append(args, *req.Bio)
		argIdx++
	}
	if req.HourlyRate != nil {
		setClauses = append(setClauses, fmt.Sprintf("hourly_rate = $%d", argIdx))
		args = append(args, *req.HourlyRate)
		argIdx++
	}
	if req.Location != nil {
		setClauses = append(setClauses, fmt.Sprintf("location = $%d", argIdx))
		args = append(args, *req.Location)
		argIdx++
	}

	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argIdx))
	args = append(args, time.Now())
	argIdx++

	if len(setClauses) > 1 {
		args = append(args, userID)
		query := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d",
			strings.Join(setClauses, ", "), argIdx)
		_, err := h.DB.Exec(query, args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, models.APIResponse{
				Success: false, Error: "Failed to update profile",
			})
			return
		}
	}

	// Update skills if provided
	if len(req.SkillIDs) > 0 {
		h.DB.Exec("DELETE FROM user_skills WHERE user_id = $1", userID)
		for _, skillID := range req.SkillIDs {
			h.DB.Exec("INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", userID, skillID)
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Profile updated successfully",
	})
}

func (h *ProfileHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	r.ParseMultipartForm(5 << 20) // 5 MB max

	file, header, err := r.FormFile("avatar")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "No file uploaded",
		})
		return
	}
	defer file.Close()

	// Validate file type
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowedExts[ext] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Only JPG, PNG, and WebP files are allowed",
		})
		return
	}

	filename := fmt.Sprintf("avatar_%d_%d%s", userID, time.Now().Unix(), ext)
	filePath := filepath.Join("uploads", filename)

	dst, err := os.Create(filePath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to save file",
		})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to save file",
		})
		return
	}

	avatarURL := "/uploads/" + filename
	h.DB.Exec("UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2", avatarURL, userID)

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    map[string]string{"avatar_url": avatarURL},
		Message: "Avatar uploaded successfully",
	})
}

func (h *ProfileHandler) SearchFreelancers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	search := query.Get("q")
	categoryID := query.Get("category_id")
	skillID := query.Get("skill_id")
	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	baseQuery := `
		SELECT DISTINCT u.id, u.first_name, u.last_name, u.patronymic, u.pinfl, u.phone, u.avatar_url, u.role, u.title, u.bio, u.hourly_rate, u.location, u.created_at, u.updated_at
		FROM users u
		LEFT JOIN user_skills us ON u.id = us.user_id
		LEFT JOIN skills s ON us.skill_id = s.id
		WHERE u.role = 'freelancer'
	`
	args := []interface{}{}
	argIdx := 1

	if search != "" {
		baseQuery += fmt.Sprintf(` AND (u.first_name ILIKE $%d OR u.last_name ILIKE $%d OR u.title ILIKE $%d)`, argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	if categoryID != "" {
		baseQuery += fmt.Sprintf(` AND s.category_id = $%d`, argIdx)
		args = append(args, categoryID)
		argIdx++
	}

	if skillID != "" {
		baseQuery += fmt.Sprintf(` AND us.skill_id = $%d`, argIdx)
		args = append(args, skillID)
		argIdx++
	}

	baseQuery += fmt.Sprintf(` ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d`, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.DB.Query(baseQuery, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Patronymic, &u.PINFL, &u.Phone, &u.AvatarURL, &u.Role, &u.Title, &u.Bio, &u.HourlyRate, &u.Location, &u.CreatedAt, &u.UpdatedAt); err == nil {
			u.Skills = getUserSkills(h.DB, u.ID)
			var avgRating sql.NullFloat64
			var reviewCount int
			h.DB.QueryRow(`SELECT COALESCE(AVG(rating), 0), COUNT(*) FROM reviews WHERE reviewee_id = $1`, u.ID).Scan(&avgRating, &reviewCount)
			if avgRating.Valid {
				r := avgRating.Float64
				u.Rating = &r
			}
			u.Reviews = reviewCount
			users = append(users, u)
		}
	}

	if users == nil {
		users = []models.User{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    users,
	})
}

// GetFeaturedFreelancers returns freelancers who have completed their profile (have title, bio, skills)
func (h *ProfileHandler) GetFeaturedFreelancers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	categoryID := query.Get("category_id")

	baseQuery := `
		SELECT DISTINCT u.id, u.first_name, u.last_name, u.patronymic, u.pinfl, u.phone, u.avatar_url, u.role, u.title, u.bio, u.hourly_rate, u.location, u.created_at, u.updated_at
		FROM users u
		JOIN user_skills us ON u.id = us.user_id
		JOIN skills s ON us.skill_id = s.id
		WHERE u.role = 'freelancer'
		  AND u.title IS NOT NULL AND u.title != ''
		  AND u.bio IS NOT NULL AND u.bio != ''
	`
	args := []interface{}{}
	argIdx := 1

	if categoryID != "" {
		baseQuery += fmt.Sprintf(` AND s.category_id = $%d`, argIdx)
		args = append(args, categoryID)
		argIdx++
	}

	baseQuery += fmt.Sprintf(` ORDER BY u.created_at DESC LIMIT $%d`, argIdx)
	args = append(args, 12)

	rows, err := h.DB.Query(baseQuery, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Patronymic, &u.PINFL, &u.Phone, &u.AvatarURL, &u.Role, &u.Title, &u.Bio, &u.HourlyRate, &u.Location, &u.CreatedAt, &u.UpdatedAt); err == nil {
			u.Skills = getUserSkills(h.DB, u.ID)
			var avgRating sql.NullFloat64
			var reviewCount int
			h.DB.QueryRow(`SELECT COALESCE(AVG(rating), 0), COUNT(*) FROM reviews WHERE reviewee_id = $1`, u.ID).Scan(&avgRating, &reviewCount)
			if avgRating.Valid {
				r := avgRating.Float64
				u.Rating = &r
			}
			u.Reviews = reviewCount
			users = append(users, u)
		}
	}

	if users == nil {
		users = []models.User{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    users,
	})
}
