-- V012__external_profiles_disable_state.sql
-- Add fields to manage deactivation state on external_profiles
-- PostgreSQL compatible

-- New columns (backward compatible defaults)
ALTER TABLE external_profiles
    ADD COLUMN IF NOT EXISTS is_disabled    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS disabled_at    TIMESTAMP WITH TIME ZONE NULL,
    ADD COLUMN IF NOT EXISTS disabled_by    BIGINT NULL,
    ADD COLUMN IF NOT EXISTS disabled_reason TEXT NULL;

-- Optional FK to users table for disabled_by (on delete set null to preserve historical data)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) THEN
        -- add constraint only if not already present
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            WHERE tc.table_name = 'external_profiles' AND tc.constraint_name = 'fk_external_profiles_disabled_by_user'
        ) THEN
            ALTER TABLE external_profiles
                ADD CONSTRAINT fk_external_profiles_disabled_by_user
                FOREIGN KEY (disabled_by) REFERENCES users(id)
                ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Helpful index to speed up queries filtering by active/disabled state
CREATE INDEX IF NOT EXISTS idx_external_profiles_is_disabled
    ON external_profiles (is_disabled);

-- Check constraint: when disabled, disabled_at must be set
ALTER TABLE external_profiles
    ADD CONSTRAINT chk_external_profiles_disabled_fields
    CHECK (
        (is_disabled = FALSE)
        OR
        (is_disabled = TRUE AND disabled_at IS NOT NULL)
    );

-- Comments
COMMENT ON COLUMN external_profiles.is_disabled IS 'Flag di disattivazione profilo (TRUE = disabilitato)';
COMMENT ON COLUMN external_profiles.disabled_at IS 'Timestamp di disattivazione del profilo';
COMMENT ON COLUMN external_profiles.disabled_by IS 'Utente amministratore che ha disattivato il profilo (FK users.id)';
COMMENT ON COLUMN external_profiles.disabled_reason IS 'Motivazione della disattivazione';
