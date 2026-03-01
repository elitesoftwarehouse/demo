-- Migration: Create refresh_tokens table to persist refresh token state
-- Date: 2026-01-17

-- Requires: extensions citext, pgcrypto are enabled by previous migrations

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'revocation_reason') THEN
        CREATE TYPE revocation_reason AS ENUM (
            'user_logout',
            'global_revoke',
            'rotated',
            'compromised',
            'admin_action',
            'other'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    jti            text        PRIMARY KEY,
    user_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash     text        NOT NULL,
    user_agent     text        NULL,
    ip            inet        NULL,
    device_id      text        NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    last_used_at   timestamptz NULL,
    expires_at     timestamptz NOT NULL,
    revoked_at     timestamptz NULL,
    revoked_by     uuid        NULL REFERENCES users(id) ON DELETE SET NULL,
    reason         revocation_reason NULL
);

COMMENT ON TABLE refresh_tokens IS 'Refresh tokens issued to users (hash stored, not raw token)';
COMMENT ON COLUMN refresh_tokens.jti IS 'JWT ID (jti) claim of the refresh token';
COMMENT ON COLUMN refresh_tokens.user_id IS 'Owner user id';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'HMAC-SHA256 hash of the raw refresh token (peppered)';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'User-Agent string when issued (optional)';
COMMENT ON COLUMN refresh_tokens.ip IS 'IP address when issued (optional)';
COMMENT ON COLUMN refresh_tokens.device_id IS 'Client-provided device id (optional)';
COMMENT ON COLUMN refresh_tokens.last_used_at IS 'Timestamp of last successful usage';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Expiration timestamp of the refresh token';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When the token was revoked';
COMMENT ON COLUMN refresh_tokens.revoked_by IS 'Who revoked the token';
COMMENT ON COLUMN refresh_tokens.reason IS 'Reason for revocation';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
