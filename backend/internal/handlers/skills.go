package handlers

import (
	"database/sql"
	"net/http"

	"freelance-platform/internal/models"
)

type SkillHandler struct {
	DB *sql.DB
}

func (h *SkillHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query("SELECT id, name, slug, icon FROM categories ORDER BY name")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Icon); err == nil {
			categories = append(categories, c)
		}
	}

	if categories == nil {
		categories = []models.Category{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    categories,
	})
}

func (h *SkillHandler) GetSkills(w http.ResponseWriter, r *http.Request) {
	categoryID := r.URL.Query().Get("category_id")

	var rows *sql.Rows
	var err error

	if categoryID != "" {
		rows, err = h.DB.Query("SELECT id, name, category_id FROM skills WHERE category_id = $1 ORDER BY name", categoryID)
	} else {
		rows, err = h.DB.Query("SELECT id, name, category_id FROM skills ORDER BY name")
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	var skills []models.Skill
	for rows.Next() {
		var s models.Skill
		if err := rows.Scan(&s.ID, &s.Name, &s.CategoryID); err == nil {
			skills = append(skills, s)
		}
	}

	if skills == nil {
		skills = []models.Skill{}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    skills,
	})
}
