-- Migration: Add profile fields to users (first_name, last_name, avatar_url, avatar_id)
-- Safe to run multiple times thanks to IF NOT EXISTS

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS avatar_id TEXT NULL;

-- Optional: length checks can be enforced at app layer; keep DB flexible for now.
-- Consider future CHECK constraints if desired, e.g., length(first_name) <= 50.
