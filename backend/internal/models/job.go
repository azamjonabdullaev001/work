package models

import "time"

type JobStatus string

const (
	JobOpen       JobStatus = "open"
	JobInProgress JobStatus = "in_progress"
	JobCompleted  JobStatus = "completed"
	JobCancelled  JobStatus = "cancelled"
)

type Job struct {
	ID              int       `json:"id"`
	ClientID        int       `json:"client_id"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	CategoryID      *int      `json:"category_id,omitempty"`
	BudgetMin       *float64  `json:"budget_min,omitempty"`
	BudgetMax       *float64  `json:"budget_max,omitempty"`
	Duration        *string   `json:"duration,omitempty"`
	ExperienceLevel *string   `json:"experience_level,omitempty"`
	Status          JobStatus `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	// Populated separately
	Client        *User    `json:"client,omitempty"`
	Skills        []Skill  `json:"skills,omitempty"`
	Category      *Category `json:"category,omitempty"`
	ProposalCount int      `json:"proposal_count"`
}

type CreateJobRequest struct {
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	CategoryID      *int     `json:"category_id,omitempty"`
	BudgetMin       *float64 `json:"budget_min,omitempty"`
	BudgetMax       *float64 `json:"budget_max,omitempty"`
	Duration        *string  `json:"duration,omitempty"`
	ExperienceLevel *string  `json:"experience_level,omitempty"`
	SkillIDs        []int    `json:"skill_ids,omitempty"`
}

type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
	Icon string `json:"icon,omitempty"`
}

type Skill struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	CategoryID *int   `json:"category_id,omitempty"`
}
