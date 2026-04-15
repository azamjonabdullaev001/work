package models

import "time"

type UserRole string

const (
	RoleFreelancer UserRole = "freelancer"
	RoleClient     UserRole = "client"
)

type User struct {
	ID         int       `json:"id"`
	FirstName  string    `json:"first_name"`
	LastName   string    `json:"last_name"`
	Patronymic *string   `json:"patronymic,omitempty"`
	PINFL      string    `json:"pinfl"`
	Phone      string    `json:"phone"`
	AvatarURL  *string   `json:"avatar_url,omitempty"`
	Role       UserRole  `json:"role"`
	Title      *string   `json:"title,omitempty"`
	Bio        *string   `json:"bio,omitempty"`
	HourlyRate *float64  `json:"hourly_rate,omitempty"`
	Location   *string   `json:"location,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	// Populated separately
	Skills    []Skill         `json:"skills,omitempty"`
	Portfolio []PortfolioItem `json:"portfolio,omitempty"`
	Rating    *float64        `json:"rating,omitempty"`
	Reviews   int             `json:"reviews_count"`
}

type RegisterRequest struct {
	FirstName       string   `json:"first_name"`
	LastName        string   `json:"last_name"`
	Patronymic      *string  `json:"patronymic,omitempty"`
	PINFL           string   `json:"pinfl"`
	Phone           string   `json:"phone"`
	Password        string   `json:"password"`
	ConfirmPassword string   `json:"confirm_password"`
	Role            UserRole `json:"role"`
}

type LoginRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type UpdateProfileRequest struct {
	FirstName  *string  `json:"first_name,omitempty"`
	LastName   *string  `json:"last_name,omitempty"`
	Patronymic *string  `json:"patronymic,omitempty"`
	Title      *string  `json:"title,omitempty"`
	Bio        *string  `json:"bio,omitempty"`
	HourlyRate *float64 `json:"hourly_rate,omitempty"`
	Location   *string  `json:"location,omitempty"`
	SkillIDs   []int    `json:"skill_ids,omitempty"`
}
