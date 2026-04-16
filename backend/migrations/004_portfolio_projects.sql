-- Add project ZIP support to portfolio
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS project_zip_url VARCHAR(500);
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS project_tree JSONB;
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS has_index BOOLEAN DEFAULT false;
