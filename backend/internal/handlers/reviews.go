package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"freelance-platform/internal/models"

	"github.com/go-chi/chi/v5"
)

type ReviewHandler struct {
	DB *sql.DB
}

func (h *ReviewHandler) CreateReview(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	var req models.CreateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid request body",
		})
		return
	}

	if req.Rating < 1 || req.Rating > 10 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Rating must be between 1 and 10",
		})
		return
	}

	// Verify contract exists and user is part of it
	var contractFreelancerID, contractClientID int
	err := h.DB.QueryRow("SELECT freelancer_id, client_id FROM contracts WHERE id = $1", req.ContractID).Scan(&contractFreelancerID, &contractClientID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Error: "Contract not found",
		})
		return
	}

	if userID != contractFreelancerID && userID != contractClientID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{
			Success: false, Error: "You are not part of this contract",
		})
		return
	}

	// Check not reviewing self
	if req.RevieweeID == userID {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Cannot review yourself",
		})
		return
	}

	var review models.Review
	err = h.DB.QueryRow(`
		INSERT INTO reviews (contract_id, reviewer_id, reviewee_id, rating, comment)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, contract_id, reviewer_id, reviewee_id, rating, comment, created_at
	`, req.ContractID, userID, req.RevieweeID, req.Rating, req.Comment).Scan(
		&review.ID, &review.ContractID, &review.ReviewerID, &review.RevieweeID,
		&review.Rating, &review.Comment, &review.CreatedAt,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to create review",
		})
		return
	}

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    review,
		Message: "Review created",
	})
}

func (h *ReviewHandler) GetUserReviews(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid user ID",
		})
		return
	}

	rows, err := h.DB.Query(`
		SELECT r.id, r.contract_id, r.reviewer_id, r.reviewee_id, r.rating, r.comment, r.created_at,
			u.first_name, u.last_name, u.avatar_url
		FROM reviews r
		JOIN users u ON r.reviewer_id = u.id
		WHERE r.reviewee_id = $1
		ORDER BY r.created_at DESC
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var reviews []models.Review
	for rows.Next() {
		var rv models.Review
		var rFirstName, rLastName string
		var rAvatar *string

		if err := rows.Scan(
			&rv.ID, &rv.ContractID, &rv.ReviewerID, &rv.RevieweeID, &rv.Rating, &rv.Comment, &rv.CreatedAt,
			&rFirstName, &rLastName, &rAvatar,
		); err == nil {
			rv.Reviewer = &models.User{
				ID:        rv.ReviewerID,
				FirstName: rFirstName,
				LastName:  rLastName,
				AvatarURL: rAvatar,
			}
			reviews = append(reviews, rv)
		}
	}

	if reviews == nil {
		reviews = []models.Review{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    reviews,
	})
}
