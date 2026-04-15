package database

import (
	"database/sql"
	"fmt"
	"log"

	"freelance-platform/internal/config"

	_ "github.com/lib/pq"
)

func Connect(cfg *config.Config) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	runMigrations(db)

	return db, nil
}

func runMigrations(db *sql.DB) {
	// Ensure pinfl column exists (for databases created before PINFL was added)
	_, err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pinfl') THEN
				ALTER TABLE users ADD COLUMN pinfl VARCHAR(14);
				UPDATE users SET pinfl = '00000000000000' WHERE pinfl IS NULL;
				ALTER TABLE users ALTER COLUMN pinfl SET NOT NULL;
				CREATE INDEX IF NOT EXISTS idx_users_pinfl ON users(pinfl);
			END IF;
		END $$;
	`)
	if err != nil {
		log.Printf("Migration (pinfl): %v", err)
	}

	// Update category icons from emojis to text keys
	_, err = db.Exec(`
		UPDATE categories SET icon = 'web' WHERE slug = 'web-development' AND icon != 'web';
		UPDATE categories SET icon = 'mobile' WHERE slug = 'mobile-development' AND icon != 'mobile';
		UPDATE categories SET icon = 'design' WHERE slug = 'design' AND icon != 'design';
		UPDATE categories SET icon = '3d' WHERE slug = '3d-modeling' AND icon != '3d';
		UPDATE categories SET icon = 'media' WHERE slug = 'photo-video' AND icon != 'media';
		UPDATE categories SET icon = 'marketing' WHERE slug = 'marketing' AND icon != 'marketing';
		UPDATE categories SET icon = 'writing' WHERE slug = 'writing' AND icon != 'writing';
		UPDATE categories SET icon = 'admin' WHERE slug = 'admin-support' AND icon != 'admin';
		UPDATE categories SET icon = 'ai' WHERE slug = 'data-science' AND icon != 'ai';
		UPDATE categories SET icon = 'devops' WHERE slug = 'devops' AND icon != 'devops';
	`)
	if err != nil {
		log.Printf("Migration (category icons): %v", err)
	}

	// Update rating constraint from 1-5 to 1-10
	_, err = db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1 FROM information_schema.check_constraints
				WHERE constraint_name = 'reviews_rating_check'
				AND check_clause LIKE '%5%'
			) THEN
				ALTER TABLE reviews DROP CONSTRAINT reviews_rating_check;
				ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 10);
			END IF;
		END $$;
	`)
	if err != nil {
		log.Printf("Migration (rating 1-10): %v", err)
	}

	// Create follows table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS follows (
			id SERIAL PRIMARY KEY,
			follower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			following_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMP DEFAULT NOW(),
			UNIQUE(follower_id, following_id)
		);
		CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
		CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
	`)
	if err != nil {
		log.Printf("Migration (follows): %v", err)
	}

	// Add confirmation fields to contracts
	_, err = db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'client_confirmed') THEN
				ALTER TABLE contracts ADD COLUMN client_confirmed BOOLEAN DEFAULT FALSE;
				ALTER TABLE contracts ADD COLUMN freelancer_confirmed BOOLEAN DEFAULT FALSE;
				ALTER TABLE contracts ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
			END IF;
		END $$;
	`)
	if err != nil {
		log.Printf("Migration (contract confirmation): %v", err)
	}

	log.Println("Database migrations checked")
}
