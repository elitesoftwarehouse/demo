-- Migration: create users table
-- Safe for PostgreSQL
-- IMPORTANT: Do not log sensitive data from this table in application logs

CREATE TYPE account_status AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DISABLED');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status account_status NOT NULL DEFAULT 'ACTIVE',
  verification_token VARCHAR(255),
  verification_expires_at TIMESTAMPTZ,
  CONSTRAINT email_format_chk CHECK (position('@' in email) > 1)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users (verification_token);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at ON users;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
