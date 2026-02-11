-- Migration: Create users table for SmartDesk Coworking
-- Safe, idempotent-ish pattern using IF NOT EXISTS where supported

-- Ensure UUID extension (for id generation if using DB-side default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Ensure CITEXT for case-insensitive emails
CREATE EXTENSION IF NOT EXISTS citext;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email CITEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  verification_token TEXT NULL,
  verification_expires_at TIMESTAMPTZ NULL,
  -- Profile fields
  first_name TEXT NULL,
  last_name TEXT NULL,
  avatar_url TEXT NULL,
  avatar_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on email (case-insensitive thanks to CITEXT)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (email);

-- Optional index to quickly lookup verification tokens
CREATE INDEX IF NOT EXISTS users_verification_token_idx ON users (verification_token);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE set_updated_at_timestamp();
