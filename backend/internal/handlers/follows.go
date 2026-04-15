package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"freelance-platform/internal/models"

	"github.com/go-chi/chi/v5"
)

type FollowHandler struct {
	DB *sql.DB
}

func (h *FollowHandler) FollowUser(w http.ResponseWriter, r *http.Request) {
	followerID := getUserIDFromContext(r)
	followingIDStr := chi.URLParam(r, "id")
	followingID, err := strconv.Atoi(followingIDStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid user ID",
		})
		return
	}

	if followerID == followingID {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Cannot follow yourself",
		})
		return
	}

	_, err = h.DB.Exec(
		"INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
		followerID, followingID,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to follow user",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Followed successfully",
	})
}

func (h *FollowHandler) UnfollowUser(w http.ResponseWriter, r *http.Request) {
	followerID := getUserIDFromContext(r)
	followingIDStr := chi.URLParam(r, "id")
	followingID, err := strconv.Atoi(followingIDStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid user ID",
		})
		return
	}

	_, err = h.DB.Exec(
		"DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
		followerID, followingID,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Failed to unfollow user",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Unfollowed successfully",
	})
}

func (h *FollowHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid user ID",
		})
		return
	}

	rows, err := h.DB.Query(`
		SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.title
		FROM follows f
		JOIN users u ON f.follower_id = u.id
		WHERE f.following_id = $1
		ORDER BY f.created_at DESC
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.AvatarURL, &u.Title); err == nil {
			users = append(users, u)
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    users,
	})
}

func (h *FollowHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid user ID",
		})
		return
	}

	rows, err := h.DB.Query(`
		SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.title
		FROM follows f
		JOIN users u ON f.following_id = u.id
		WHERE f.follower_id = $1
		ORDER BY f.created_at DESC
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Error: "Database error",
		})
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.AvatarURL, &u.Title); err == nil {
			users = append(users, u)
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    users,
	})
}

func (h *FollowHandler) CheckFollow(w http.ResponseWriter, r *http.Request) {
	followerID := getUserIDFromContext(r)
	followingIDStr := chi.URLParam(r, "id")
	followingID, err := strconv.Atoi(followingIDStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid user ID",
		})
		return
	}

	var exists bool
	h.DB.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2)",
		followerID, followingID,
	).Scan(&exists)

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data:    map[string]interface{}{"is_following": exists},
	})
}

func (h *FollowHandler) GetFollowCounts(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Error: "Invalid user ID",
		})
		return
	}

	var followersCount, followingCount int
	h.DB.QueryRow("SELECT COUNT(*) FROM follows WHERE following_id = $1", userID).Scan(&followersCount)
	h.DB.QueryRow("SELECT COUNT(*) FROM follows WHERE follower_id = $1", userID).Scan(&followingCount)

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"followers_count": followersCount,
			"following_count": followingCount,
		},
	})
}
