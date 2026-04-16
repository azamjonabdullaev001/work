package models

import (
	"encoding/json"
	"time"
)

type PortfolioItem struct {
	ID            int              `json:"id"`
	UserID        int              `json:"user_id"`
	Title         string           `json:"title"`
	Description   *string          `json:"description,omitempty"`
	ImageURL      *string          `json:"image_url,omitempty"`
	ProjectURL    *string          `json:"project_url,omitempty"`
	ProjectZipURL *string          `json:"project_zip_url,omitempty"`
	ProjectTree   *json.RawMessage `json:"project_tree,omitempty"`
	HasIndex      bool             `json:"has_index"`
	IsFeatured    bool             `json:"is_featured"`
	CreatedAt     time.Time        `json:"created_at"`
}

type CreatePortfolioRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	ProjectURL  *string `json:"project_url,omitempty"`
	IsFeatured  bool    `json:"is_featured"`
}
