package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
	"unicode/utf8"

	"freelance-platform/internal/config"
	"freelance-platform/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	DB  *sql.DB
	Cfg *config.Config
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid request body",
		})
		return
	}

	// Validation
	if req.FirstName == "" || req.LastName == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "First name and last name are required",
		})
		return
	}

	if req.Phone == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Phone number is required",
		})
		return
	}

	if req.PINFL == "" || len(req.PINFL) != 14 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "PINFL must be exactly 14 digits",
		})
		return
	}

	if utf8.RuneCountInString(req.Password) < 6 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Password must be at least 6 characters",
		})
		return
	}

	if req.Password != req.ConfirmPassword {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Passwords do not match",
		})
		return
	}

	if req.Role != models.RoleFreelancer && req.Role != models.RoleClient {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Role must be 'freelancer' or 'client'",
		})
		return
	}

	// Check if phone already exists
	var exists bool
	err := h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE phone = $1)", req.Phone).Scan(&exists)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	if exists {
		writeJSON(w, http.StatusConflict, models.APIResponse{
			Success: false, Error: "Phone number already registered",
		})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to hash password",
		})
		return
	}

	// Insert user
	var user models.User
	err = h.DB.QueryRow(`
		INSERT INTO users (first_name, last_name, patronymic, pinfl, phone, password_hash, role)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, first_name, last_name, patronymic, pinfl, phone, avatar_url, role, title, bio, hourly_rate, location, created_at, updated_at
	`, req.FirstName, req.LastName, req.Patronymic, req.PINFL, req.Phone, string(hashedPassword), req.Role).Scan(
		&user.ID, &user.FirstName, &user.LastName, &user.Patronymic, &user.PINFL, &user.Phone,
		&user.AvatarURL, &user.Role, &user.Title, &user.Bio, &user.HourlyRate,
		&user.Location, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to create user",
		})
		return
	}

	// Generate JWT
	token, err := h.generateToken(user.ID, string(user.Role))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to generate token",
		})
		return
	}

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true,
		Data: models.LoginResponse{
			Token: token,
			User:  user,
		},
		Message: "Registration successful",
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid request body",
		})
		return
	}

	if req.Phone == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Phone and password are required",
		})
		return
	}

	var user models.User
	var passwordHash string
	err := h.DB.QueryRow(`
		SELECT id, first_name, last_name, patronymic, pinfl, phone, password_hash, avatar_url, role, title, bio, hourly_rate, location, created_at, updated_at
		FROM users WHERE phone = $1
	`, req.Phone).Scan(
		&user.ID, &user.FirstName, &user.LastName, &user.Patronymic, &user.PINFL, &user.Phone,
		&passwordHash, &user.AvatarURL, &user.Role, &user.Title, &user.Bio,
		&user.HourlyRate, &user.Location, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusUnauthorized, models.APIResponse{
			Success: false, Error: "Invalid phone or password",
		})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		writeJSON(w, http.StatusUnauthorized, models.APIResponse{
			Success: false, Error: "Invalid phone or password",
		})
		return
	}

	token, err := h.generateToken(user.ID, string(user.Role))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to generate token",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data: models.LoginResponse{
			Token: token,
			User:  user,
		},
	})
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	var user models.User
	err := h.DB.QueryRow(`
		SELECT id, first_name, last_name, patronymic, pinfl, phone, avatar_url, role, title, bio, hourly_rate, location, created_at, updated_at
		FROM users WHERE id = $1
	`, userID).Scan(
		&user.ID, &user.FirstName, &user.LastName, &user.Patronymic, &user.PINFL, &user.Phone,
		&user.AvatarURL, &user.Role, &user.Title, &user.Bio, &user.HourlyRate,
		&user.Location, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Error: "User not found",
		})
		return
	}

	// Get skills
	user.Skills = getUserSkills(h.DB, user.ID)

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

func (h *AuthHandler) generateToken(userID int, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.Cfg.JWTSecret))
}
