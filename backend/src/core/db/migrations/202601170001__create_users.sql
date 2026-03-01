-- Migration: Create users table with secure constraints and indexes
-- Date: 2026-01-17

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- User account status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'DISABLED');
    END IF;
END$$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   citext          NOT NULL UNIQUE,
    password_hash           text            NOT NULL,
    salt                    text            NULL,
    status                  user_status     NOT NULL DEFAULT 'ACTIVE',
    verification_token      text            NULL UNIQUE,
    verification_expires_at timestamptz     NULL,
    created_at              timestamptz     NOT NULL DEFAULT now(),
    updated_at              timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'Application users with credentials and status';
COMMENT ON COLUMN users.email IS 'Unique email (case-insensitive via CITEXT)';
COMMENT ON COLUMN users.password_hash IS 'Secure password hash (never log or expose)';
COMMENT ON COLUMN users.salt IS 'Optional salt if not handled by hash library';
COMMENT ON COLUMN users.status IS 'Account status (ACTIVE, PENDING, SUSPENDED, DISABLED)';
COMMENT ON COLUMN users.verification_token IS 'Optional token for email verification / flows';
COMMENT ON COLUMN users.verification_expires_at IS 'Expiry datetime for verification token';

-- Indexes to support common queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Trigger to auto-update updated_at on row change
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'set_timestamp' AND n.nspname = 'public'
    ) THEN
        CREATE FUNCTION public.set_timestamp()
        RETURNS trigger AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    END IF;
END$$;

DROP TRIGGER IF EXISTS trg_set_timestamp ON users;
CREATE TRIGGER trg_set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
