package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"freelance-platform/internal/models"

	"github.com/go-chi/chi/v5"
)

type ContractHandler struct {
	DB *sql.DB
}

func (h *ContractHandler) GetMyContracts(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	rows, err := h.DB.Query(`
		SELECT c.id, c.job_id, c.freelancer_id, c.client_id, c.amount,
			COALESCE(c.status, 'pending'), c.started_at,
			COALESCE(c.client_confirmed, false), COALESCE(c.freelancer_confirmed, false),
			j.title,
			uf.first_name, uf.last_name, uf.avatar_url,
			uc.first_name, uc.last_name, uc.avatar_url
		FROM contracts c
		JOIN jobs j ON c.job_id = j.id
		JOIN users uf ON c.freelancer_id = uf.id
		JOIN users uc ON c.client_id = uc.id
		WHERE c.freelancer_id = $1 OR c.client_id = $1
		ORDER BY c.started_at DESC
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	type ContractResponse struct {
		ID                  int     `json:"id"`
		JobID               int     `json:"job_id"`
		FreelancerID        int     `json:"freelancer_id"`
		ClientID            int     `json:"client_id"`
		Amount              float64 `json:"amount"`
		Status              string  `json:"status"`
		StartedAt           string  `json:"started_at"`
		ClientConfirmed     bool    `json:"client_confirmed"`
		FreelancerConfirmed bool    `json:"freelancer_confirmed"`
		JobTitle            string  `json:"job_title"`
		FreelancerName      string  `json:"freelancer_name"`
		FreelancerAvatar    *string `json:"freelancer_avatar"`
		ClientName          string  `json:"client_name"`
		ClientAvatar        *string `json:"client_avatar"`
	}

	var contracts []ContractResponse
	for rows.Next() {
		var c ContractResponse
		var fFirst, fLast, cFirst, cLast string
		var startedAt interface{}
		if err := rows.Scan(
			&c.ID, &c.JobID, &c.FreelancerID, &c.ClientID, &c.Amount,
			&c.Status, &startedAt,
			&c.ClientConfirmed, &c.FreelancerConfirmed,
			&c.JobTitle,
			&fFirst, &fLast, &c.FreelancerAvatar,
			&cFirst, &cLast, &c.ClientAvatar,
		); err == nil {
			c.FreelancerName = fFirst + " " + fLast
			c.ClientName = cFirst + " " + cLast
			contracts = append(contracts, c)
		}
	}

	if contracts == nil {
		contracts = []ContractResponse{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    contracts,
	})
}

func (h *ContractHandler) ConfirmContract(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	contractID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid contract ID",
		})
		return
	}

	var freelancerID, clientID int
	err = h.DB.QueryRow("SELECT freelancer_id, client_id FROM contracts WHERE id = $1", contractID).Scan(&freelancerID, &clientID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Error: "Contract not found",
		})
		return
	}

	if userID != freelancerID && userID != clientID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{
			Success: false, Error: "Access denied",
		})
		return
	}

	if userID == clientID {
		h.DB.Exec("UPDATE contracts SET client_confirmed = true WHERE id = $1", contractID)
	} else {
		h.DB.Exec("UPDATE contracts SET freelancer_confirmed = true WHERE id = $1", contractID)
	}

	// Check if both confirmed
	var clientConfirmed, freelancerConfirmed bool
	h.DB.QueryRow("SELECT COALESCE(client_confirmed, false), COALESCE(freelancer_confirmed, false) FROM contracts WHERE id = $1", contractID).Scan(&clientConfirmed, &freelancerConfirmed)

	if clientConfirmed && freelancerConfirmed {
		h.DB.Exec("UPDATE contracts SET status = 'active' WHERE id = $1", contractID)
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Contract confirmed",
		Data: map[string]interface{}{
			"client_confirmed":    clientConfirmed,
			"freelancer_confirmed": freelancerConfirmed,
			"status":              func() string { if clientConfirmed && freelancerConfirmed { return "active" }; return "pending" }(),
		},
	})
}
