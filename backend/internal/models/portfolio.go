package models

import "time"

type PortfolioItem struct {
	ID          int       `json:"id"`
	UserID      int       `json:"user_id"`
	Title       string    `json:"title"`
	Description *string   `json:"description,omitempty"`
	ImageURL    *string   `json:"image_url,omitempty"`
	ProjectURL  *string   `json:"project_url,omitempty"`
	IsFeatured  bool      `json:"is_featured"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreatePortfolioRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	ProjectURL  *string `json:"project_url,omitempty"`
	IsFeatured  bool    `json:"is_featured"`
}
