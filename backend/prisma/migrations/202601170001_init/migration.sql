-- Migration: init user table for SmartDesk Coworking
-- Database: PostgreSQL
-- Safety: No logging of sensitive columns (hash, token) should be implemented at app layer

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum for user status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userstatus') THEN
        CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'PENDING');
    END IF;
END $$;

-- Table users
CREATE TABLE IF NOT EXISTS "users" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email citext NOT NULL UNIQUE,
    password_hash varchar(255) NOT NULL,
    salt varchar(255),
    account_status "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    verification_token varchar(255) UNIQUE,
    verification_expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON "users";
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Indices
CREATE INDEX IF NOT EXISTS idx_users_created_at ON "users"(created_at);
