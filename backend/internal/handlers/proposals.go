package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"freelance-platform/internal/models"

	"github.com/go-chi/chi/v5"
)

type ProposalHandler struct {
	DB *sql.DB
}

func (h *ProposalHandler) CreateProposal(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)
	role := getUserRoleFromContext(r)

	if role != "freelancer" {
		writeJSON(w, http.StatusForbidden, models.APIResponse{
			Success: false, Error: "Only freelancers can submit proposals",
		})
		return
	}

	idStr := chi.URLParam(r, "id")
	jobID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid job ID",
		})
		return
	}

	// Check if already submitted
	var exists bool
	h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM proposals WHERE job_id = $1 AND freelancer_id = $2)", jobID, userID).Scan(&exists)
	if exists {
		writeJSON(w, http.StatusConflict, models.APIResponse{
			Success: false, Error: "You already submitted a proposal for this job",
		})
		return
	}

	var req models.CreateProposalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid request body",
		})
		return
	}

	if req.BidAmount <= 0 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Bid amount must be positive",
		})
		return
	}

	var proposal models.Proposal
	err = h.DB.QueryRow(`
		INSERT INTO proposals (job_id, freelancer_id, cover_letter, bid_amount, duration)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, job_id, freelancer_id, cover_letter, bid_amount, duration, status, created_at
	`, jobID, userID, req.CoverLetter, req.BidAmount, req.Duration).Scan(
		&proposal.ID, &proposal.JobID, &proposal.FreelancerID,
		&proposal.CoverLetter, &proposal.BidAmount, &proposal.Duration,
		&proposal.Status, &proposal.CreatedAt,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to create proposal",
		})
		return
	}

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    proposal,
		Message: "Proposal submitted successfully",
	})
}

func (h *ProposalHandler) GetJobProposals(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	jobID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid job ID",
		})
		return
	}

	// Verify job belongs to user
	var clientID int
	err = h.DB.QueryRow("SELECT client_id FROM jobs WHERE id = $1", jobID).Scan(&clientID)
	if err != nil || clientID != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{
			Success: false, Error: "Access denied",
		})
		return
	}

	rows, err := h.DB.Query(`
		SELECT p.id, p.job_id, p.freelancer_id, p.cover_letter, p.bid_amount, p.duration, p.status, p.created_at,
			u.first_name, u.last_name, u.avatar_url, u.title
		FROM proposals p
		JOIN users u ON p.freelancer_id = u.id
		WHERE p.job_id = $1
		ORDER BY p.created_at DESC
	`, jobID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var proposals []models.Proposal
	for rows.Next() {
		var p models.Proposal
		var fFirstName, fLastName string
		var fAvatar, fTitle *string

		if err := rows.Scan(
			&p.ID, &p.JobID, &p.FreelancerID, &p.CoverLetter, &p.BidAmount, &p.Duration, &p.Status, &p.CreatedAt,
			&fFirstName, &fLastName, &fAvatar, &fTitle,
		); err == nil {
			p.Freelancer = &models.User{
				ID:        p.FreelancerID,
				FirstName: fFirstName,
				LastName:  fLastName,
				AvatarURL: fAvatar,
				Title:     fTitle,
			}
			p.Freelancer.Skills = getUserSkills(h.DB, p.FreelancerID)
			proposals = append(proposals, p)
		}
	}

	if proposals == nil {
		proposals = []models.Proposal{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    proposals,
	})
}

func (h *ProposalHandler) GetMyProposals(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	rows, err := h.DB.Query(`
		SELECT p.id, p.job_id, p.freelancer_id, p.cover_letter, p.bid_amount, p.duration, p.status, p.created_at,
			j.title, j.description, j.budget_min, j.budget_max, j.status as job_status
		FROM proposals p
		JOIN jobs j ON p.job_id = j.id
		WHERE p.freelancer_id = $1
		ORDER BY p.created_at DESC
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var proposals []models.Proposal
	for rows.Next() {
		var p models.Proposal
		var jTitle, jDesc string
		var jBudgetMin, jBudgetMax *float64
		var jStatus models.JobStatus

		if err := rows.Scan(
			&p.ID, &p.JobID, &p.FreelancerID, &p.CoverLetter, &p.BidAmount, &p.Duration, &p.Status, &p.CreatedAt,
			&jTitle, &jDesc, &jBudgetMin, &jBudgetMax, &jStatus,
		); err == nil {
			p.Job = &models.Job{
				ID:          p.JobID,
				Title:       jTitle,
				Description: jDesc,
				BudgetMin:   jBudgetMin,
				BudgetMax:   jBudgetMax,
				Status:      jStatus,
			}
			proposals = append(proposals, p)
		}
	}

	if proposals == nil {
		proposals = []models.Proposal{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    proposals,
	})
}

func (h *ProposalHandler) AcceptProposal(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	proposalID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid proposal ID",
		})
		return
	}

	// Get proposal and verify ownership
	var proposal models.Proposal
	var clientID int
	err = h.DB.QueryRow(`
		SELECT p.id, p.job_id, p.freelancer_id, p.bid_amount, j.client_id
		FROM proposals p JOIN jobs j ON p.job_id = j.id
		WHERE p.id = $1
	`, proposalID).Scan(&proposal.ID, &proposal.JobID, &proposal.FreelancerID, &proposal.BidAmount, &clientID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Error: "Proposal not found",
		})
		return
	}

	if clientID != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{
			Success: false, Error: "Access denied",
		})
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Transaction error",
		})
		return
	}
	defer tx.Rollback()

	// Accept this proposal
	tx.Exec("UPDATE proposals SET status = 'accepted' WHERE id = $1", proposalID)
	// Reject others
	tx.Exec("UPDATE proposals SET status = 'rejected' WHERE job_id = $1 AND id != $2 AND status = 'pending'", proposal.JobID, proposalID)
	// Update job status
	tx.Exec("UPDATE jobs SET status = 'in_progress', updated_at = NOW() WHERE id = $1", proposal.JobID)
	// Create contract
	tx.Exec(`INSERT INTO contracts (job_id, freelancer_id, client_id, amount) VALUES ($1, $2, $3, $4)`,
		proposal.JobID, proposal.FreelancerID, userID, proposal.BidAmount)

	if err := tx.Commit(); err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to accept proposal",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Proposal accepted, contract created",
	})
}
