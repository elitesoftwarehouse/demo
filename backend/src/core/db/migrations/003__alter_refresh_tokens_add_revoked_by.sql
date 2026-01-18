-- Migration: add revoked_by column to refresh_tokens
-- Safe for PostgreSQL

ALTER TABLE IF EXISTS refresh_tokens
ADD COLUMN IF NOT EXISTS revoked_by VARCHAR(255);

-- Optional index if querying by revoked_by becomes common
-- CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_by ON refresh_tokens (revoked_by);
