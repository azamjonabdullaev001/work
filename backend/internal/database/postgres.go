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

	log.Println("Database migrations checked")
}
