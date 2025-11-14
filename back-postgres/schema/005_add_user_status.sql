-- Add status column to users table
-- Status values: active, inactive, suspended

DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;
        CREATE INDEX idx_users_status ON users(status);
    END IF;
END $$;

-- Update existing users to have 'active' status
UPDATE users SET status = 'active' WHERE status IS NULL;

COMMENT ON COLUMN users.status IS 'User account status: active, inactive, suspended';
