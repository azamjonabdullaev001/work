package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"freelance-platform/internal/models"

	"github.com/go-chi/chi/v5"
)

type JobHandler struct {
	DB *sql.DB
}

func (h *JobHandler) CreateJob(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)
	role := getUserRoleFromContext(r)

	if role != "client" {
		writeJSON(w, http.StatusForbidden, models.APIResponse{
			Success: false, Error: "Only clients can create jobs",
		})
		return
	}

	var req models.CreateJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid request body",
		})
		return
	}

	if req.Title == "" || req.Description == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Title and description are required",
		})
		return
	}

	var job models.Job
	err := h.DB.QueryRow(`
		INSERT INTO jobs (client_id, title, description, category_id, budget_min, budget_max, duration, experience_level)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, client_id, title, description, category_id, budget_min, budget_max, duration, experience_level, status, created_at, updated_at
	`, userID, req.Title, req.Description, req.CategoryID, req.BudgetMin, req.BudgetMax, req.Duration, req.ExperienceLevel).Scan(
		&job.ID, &job.ClientID, &job.Title, &job.Description, &job.CategoryID,
		&job.BudgetMin, &job.BudgetMax, &job.Duration, &job.ExperienceLevel,
		&job.Status, &job.CreatedAt, &job.UpdatedAt,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to create job",
		})
		return
	}

	// Add skills
	for _, skillID := range req.SkillIDs {
		h.DB.Exec("INSERT INTO job_skills (job_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", job.ID, skillID)
	}

	job.Skills = getJobSkills(h.DB, job.ID)

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    job,
		Message: "Job created successfully",
	})
}

func (h *JobHandler) ListJobs(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	search := query.Get("q")
	categoryID := query.Get("category_id")
	status := query.Get("status")
	if status == "" {
		status = "open"
	}
	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	baseQuery := `
		SELECT j.id, j.client_id, j.title, j.description, j.category_id, j.budget_min, j.budget_max,
			j.duration, j.experience_level, j.status, j.created_at, j.updated_at,
			u.first_name, u.last_name, u.avatar_url,
			c.name as category_name, c.slug, c.icon,
			(SELECT COUNT(*) FROM proposals WHERE job_id = j.id) as proposal_count
		FROM jobs j
		JOIN users u ON j.client_id = u.id
		LEFT JOIN categories c ON j.category_id = c.id
		WHERE j.status = $1
	`
	args := []interface{}{status}
	argIdx := 2

	if search != "" {
		baseQuery += fmt.Sprintf(` AND (j.title ILIKE $%d OR j.description ILIKE $%d)`, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	if categoryID != "" {
		baseQuery += fmt.Sprintf(` AND j.category_id = $%d`, argIdx)
		args = append(args, categoryID)
		argIdx++
	}

	baseQuery += fmt.Sprintf(` ORDER BY j.created_at DESC LIMIT $%d OFFSET $%d`, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.DB.Query(baseQuery, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var jobs []models.Job
	for rows.Next() {
		var j models.Job
		var clientFirstName, clientLastName string
		var clientAvatar *string
		var catName, catSlug sql.NullString
		var catIcon sql.NullString

		err := rows.Scan(
			&j.ID, &j.ClientID, &j.Title, &j.Description, &j.CategoryID,
			&j.BudgetMin, &j.BudgetMax, &j.Duration, &j.ExperienceLevel,
			&j.Status, &j.CreatedAt, &j.UpdatedAt,
			&clientFirstName, &clientLastName, &clientAvatar,
			&catName, &catSlug, &catIcon,
			&j.ProposalCount,
		)
		if err != nil {
			continue
		}

		j.Client = &models.User{
			ID:        j.ClientID,
			FirstName: clientFirstName,
			LastName:  clientLastName,
			AvatarURL: clientAvatar,
		}

		if catName.Valid {
			j.Category = &models.Category{
				Name: catName.String,
				Slug: catSlug.String,
				Icon: catIcon.String,
			}
		}

		j.Skills = getJobSkills(h.DB, j.ID)
		jobs = append(jobs, j)
	}

	if jobs == nil {
		jobs = []models.Job{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    jobs,
	})
}

func (h *JobHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	jobID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid job ID",
		})
		return
	}

	var j models.Job
	var clientFirstName, clientLastName string
	var clientAvatar *string
	var catName, catSlug, catIcon sql.NullString

	err = h.DB.QueryRow(`
		SELECT j.id, j.client_id, j.title, j.description, j.category_id, j.budget_min, j.budget_max,
			j.duration, j.experience_level, j.status, j.created_at, j.updated_at,
			u.first_name, u.last_name, u.avatar_url,
			c.name, c.slug, c.icon,
			(SELECT COUNT(*) FROM proposals WHERE job_id = j.id) as proposal_count
		FROM jobs j
		JOIN users u ON j.client_id = u.id
		LEFT JOIN categories c ON j.category_id = c.id
		WHERE j.id = $1
	`, jobID).Scan(
		&j.ID, &j.ClientID, &j.Title, &j.Description, &j.CategoryID,
		&j.BudgetMin, &j.BudgetMax, &j.Duration, &j.ExperienceLevel,
		&j.Status, &j.CreatedAt, &j.UpdatedAt,
		&clientFirstName, &clientLastName, &clientAvatar,
		&catName, &catSlug, &catIcon,
		&j.ProposalCount,
	)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Error: "Job not found",
		})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}

	j.Client = &models.User{
		ID:        j.ClientID,
		FirstName: clientFirstName,
		LastName:  clientLastName,
		AvatarURL: clientAvatar,
	}

	if catName.Valid {
		j.Category = &models.Category{
			Name: catName.String,
			Slug: catSlug.String,
			Icon: catIcon.String,
		}
	}

	j.Skills = getJobSkills(h.DB, j.ID)

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    j,
	})
}

func (h *JobHandler) GetMyJobs(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	rows, err := h.DB.Query(`
		SELECT j.id, j.client_id, j.title, j.description, j.category_id, j.budget_min, j.budget_max,
			j.duration, j.experience_level, j.status, j.created_at, j.updated_at,
			(SELECT COUNT(*) FROM proposals WHERE job_id = j.id) as proposal_count
		FROM jobs j WHERE j.client_id = $1
		ORDER BY j.created_at DESC
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var jobs []models.Job
	for rows.Next() {
		var j models.Job
		if err := rows.Scan(
			&j.ID, &j.ClientID, &j.Title, &j.Description, &j.CategoryID,
			&j.BudgetMin, &j.BudgetMax, &j.Duration, &j.ExperienceLevel,
			&j.Status, &j.CreatedAt, &j.UpdatedAt, &j.ProposalCount,
		); err == nil {
			j.Skills = getJobSkills(h.DB, j.ID)
			jobs = append(jobs, j)
		}
	}

	if jobs == nil {
		jobs = []models.Job{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    jobs,
	})
}

func (h *JobHandler) DeleteJob(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	jobID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid job ID",
		})
		return
	}

	result, err := h.DB.Exec("DELETE FROM jobs WHERE id = $1 AND client_id = $2", jobID, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to delete job",
		})
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Error: "Job not found or not yours",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Job deleted successfully",
	})
}
