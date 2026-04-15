package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"freelance-platform/internal/middleware"
	"freelance-platform/internal/models"
)

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func getUserIDFromContext(r *http.Request) int {
	return middleware.GetUserID(r.Context())
}

func getUserRoleFromContext(r *http.Request) string {
	return middleware.GetUserRole(r.Context())
}

func getUserSkills(db *sql.DB, userID int) []models.Skill {
	rows, err := db.Query(`
		SELECT s.id, s.name, s.category_id
		FROM skills s
		JOIN user_skills us ON s.id = us.skill_id
		WHERE us.user_id = $1
	`, userID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var skills []models.Skill
	for rows.Next() {
		var s models.Skill
		if err := rows.Scan(&s.ID, &s.Name, &s.CategoryID); err == nil {
			skills = append(skills, s)
		}
	}
	return skills
}

func getJobSkills(db *sql.DB, jobID int) []models.Skill {
	rows, err := db.Query(`
		SELECT s.id, s.name, s.category_id
		FROM skills s
		JOIN job_skills js ON s.id = js.skill_id
		WHERE js.job_id = $1
	`, jobID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var skills []models.Skill
	for rows.Next() {
		var s models.Skill
		if err := rows.Scan(&s.ID, &s.Name, &s.CategoryID); err == nil {
			skills = append(skills, s)
		}
	}
	return skills
}
