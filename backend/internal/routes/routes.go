package routes

import (
	"database/sql"
	"net/http"

	"freelance-platform/internal/config"
	"freelance-platform/internal/handlers"
	"freelance-platform/internal/middleware"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func Setup(db *sql.DB, cfg *config.Config) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RealIP)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:5173", "http://*", "https://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Static files
	fileServer := http.FileServer(http.Dir("./uploads"))
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", fileServer))

	// Handlers
	authHandler := &handlers.AuthHandler{DB: db, Cfg: cfg}
	profileHandler := &handlers.ProfileHandler{DB: db}
	jobHandler := &handlers.JobHandler{DB: db}
	portfolioHandler := &handlers.PortfolioHandler{DB: db}
	proposalHandler := &handlers.ProposalHandler{DB: db}
	skillHandler := &handlers.SkillHandler{DB: db}
	reviewHandler := &handlers.ReviewHandler{DB: db}
	followHandler := &handlers.FollowHandler{DB: db}
	contractHandler := &handlers.ContractHandler{DB: db}

	authMW := middleware.AuthMiddleware(cfg.JWTSecret)

	r.Route("/api", func(r chi.Router) {
		// Public routes
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)

		r.Get("/categories", skillHandler.GetCategories)
		r.Get("/skills", skillHandler.GetSkills)

		r.Get("/jobs", jobHandler.ListJobs)
		r.Get("/jobs/{id}", jobHandler.GetJob)

		r.Get("/profile/{id}", profileHandler.GetProfile)
		r.Get("/freelancers", profileHandler.SearchFreelancers)
		r.Get("/freelancers/featured", profileHandler.GetFeaturedFreelancers)
		r.Get("/reviews/{id}", reviewHandler.GetUserReviews)
		r.Get("/followers/{id}", followHandler.GetFollowers)
		r.Get("/following/{id}", followHandler.GetFollowing)
		r.Get("/follow-counts/{id}", followHandler.GetFollowCounts)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(authMW)

			r.Get("/auth/me", authHandler.GetMe)
			r.Put("/profile", profileHandler.UpdateProfile)
			r.Post("/profile/avatar", profileHandler.UploadAvatar)

			r.Post("/jobs", jobHandler.CreateJob)
			r.Get("/jobs/my", jobHandler.GetMyJobs)
			r.Delete("/jobs/{id}", jobHandler.DeleteJob)

			r.Get("/portfolio", portfolioHandler.GetMyPortfolio)
			r.Post("/portfolio", portfolioHandler.CreatePortfolioItem)
			r.Put("/portfolio/{id}", portfolioHandler.UpdatePortfolioItem)
			r.Delete("/portfolio/{id}", portfolioHandler.DeletePortfolioItem)

			r.Post("/jobs/{id}/proposals", proposalHandler.CreateProposal)
			r.Get("/jobs/{id}/proposals", proposalHandler.GetJobProposals)
			r.Get("/proposals/my", proposalHandler.GetMyProposals)
			r.Put("/proposals/{id}/accept", proposalHandler.AcceptProposal)

			r.Post("/reviews", reviewHandler.CreateReview)

			r.Post("/follow/{id}", followHandler.FollowUser)
			r.Delete("/follow/{id}", followHandler.UnfollowUser)
			r.Get("/follow/check/{id}", followHandler.CheckFollow)

			r.Get("/contracts/my", contractHandler.GetMyContracts)
			r.Put("/contracts/{id}/confirm", contractHandler.ConfirmContract)
		})
	})

	return r
}
