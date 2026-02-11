-- Migration: Add JTI and revocation metadata to user_sessions
-- Enhances session tracking for refresh tokens

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS jti TEXT NULL,
  ADD COLUMN IF NOT EXISTS revoked_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS revoke_reason TEXT NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS user_sessions_jti_idx ON user_sessions(jti);
CREATE INDEX IF NOT EXISTS user_sessions_revoked_at_idx ON user_sessions(revoked_at);

-- Optional: backfill jti with NULL; clients will start storing it from app layer
