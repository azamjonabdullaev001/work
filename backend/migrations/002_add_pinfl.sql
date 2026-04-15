-- Add PINFL column to users table (if upgrading from v1)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pinfl') THEN
        ALTER TABLE users ADD COLUMN pinfl VARCHAR(14);
        UPDATE users SET pinfl = '00000000000000' WHERE pinfl IS NULL;
        ALTER TABLE users ALTER COLUMN pinfl SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_users_pinfl ON users(pinfl);
    END IF;
END $$;
