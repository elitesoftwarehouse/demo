-- Migration: Alter users table to add basic profile fields
-- Date: 2026-01-17

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS first_name text NULL,
    ADD COLUMN IF NOT EXISTS last_name text NULL,
    ADD COLUMN IF NOT EXISTS avatar_url text NULL,
    ADD COLUMN IF NOT EXISTS avatar_id text NULL;

-- Optional: basic length constraints to prevent abuse
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_first_name_len_chk'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_first_name_len_chk CHECK (
                first_name IS NULL OR char_length(first_name) <= 100
            );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_last_name_len_chk'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_last_name_len_chk CHECK (
                last_name IS NULL OR char_length(last_name) <= 100
            );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_avatar_url_len_chk'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_avatar_url_len_chk CHECK (
                avatar_url IS NULL OR char_length(avatar_url) <= 2048
            );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_avatar_id_len_chk'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_avatar_id_len_chk CHECK (
                avatar_id IS NULL OR char_length(avatar_id) <= 128
            );
    END IF;
END$$;

COMMENT ON COLUMN users.first_name IS 'User given name (optional)';
COMMENT ON COLUMN users.last_name IS 'User family name (optional)';
COMMENT ON COLUMN users.avatar_url IS 'Public URL to avatar image (optional)';
COMMENT ON COLUMN users.avatar_id IS 'Storage identifier for avatar asset (optional)';
