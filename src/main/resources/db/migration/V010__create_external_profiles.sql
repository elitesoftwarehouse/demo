-- V010__create_external_profiles.sql
-- Create table to store external profiles for Professionals, Companies, and External Collaborators
-- PostgreSQL compatible

CREATE TABLE IF NOT EXISTS external_profiles (
    id                 BIGSERIAL PRIMARY KEY,

    -- linkage to portal user (optional until account is created)
    user_id            BIGINT NULL,

    -- business fields
    type               VARCHAR(32) NOT NULL,   -- PROFESSIONISTA | AZIENDA | COLLABORATORE_ESTERNO
    status             VARCHAR(32) NOT NULL,   -- DRAFT | IN_REVIEW | APPROVED | REJECTED

    -- anagraphic data (natural person)
    first_name         VARCHAR(100),
    last_name          VARCHAR(100),

    -- company data (legal entity)
    company_name       VARCHAR(255),

    -- contacts
    email              VARCHAR(255) NOT NULL,
    phone              VARCHAR(50),

    -- address
    address_line       VARCHAR(255),
    address_line2      VARCHAR(255),
    postal_code        VARCHAR(20),
    city               VARCHAR(120),
    province           VARCHAR(120),
    region             VARCHAR(120),
    country_code       VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2

    -- fiscal data
    fiscal_code        VARCHAR(32),      -- Codice Fiscale (CF)
    vat_number         VARCHAR(32),      -- Partita IVA (P.IVA)
    sdi_code           VARCHAR(16),      -- Codice SDI per fatturazione elettronica
    pec_email          VARCHAR(255),     -- PEC

    -- process tracking
    submitted_at       TIMESTAMP WITH TIME ZONE,
    reviewed_at        TIMESTAMP WITH TIME ZONE,
    approved_at        TIMESTAMP WITH TIME ZONE,
    rejected_at        TIMESTAMP WITH TIME ZONE,

    rejection_reason   TEXT,
    notes              TEXT,

    -- audit
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- FK to users table if present (on delete set null so we keep historical data)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) THEN
        ALTER TABLE external_profiles
            ADD CONSTRAINT fk_external_profiles_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- status and type checks
ALTER TABLE external_profiles
    ADD CONSTRAINT chk_external_profiles_type
    CHECK (type IN ('PROFESSIONISTA', 'AZIENDA', 'COLLABORATORE_ESTERNO'));

ALTER TABLE external_profiles
    ADD CONSTRAINT chk_external_profiles_status
    CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED'));

-- consistency checks between type and required fields
ALTER TABLE external_profiles
    ADD CONSTRAINT chk_external_profiles_required_fields
    CHECK (
        (
            -- Company profile must have company_name and VAT
            type = 'AZIENDA' AND company_name IS NOT NULL AND vat_number IS NOT NULL
        )
        OR
        (
            -- Person or external collaborator must have first_name, last_name and fiscal_code
            type IN ('PROFESSIONISTA', 'COLLABORATORE_ESTERNO') AND first_name IS NOT NULL AND last_name IS NOT NULL AND fiscal_code IS NOT NULL
        )
    );

-- unique constraints (partial unique indexes to allow multiple NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS uq_external_profiles_fiscal_code
    ON external_profiles (LOWER(fiscal_code))
    WHERE fiscal_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_external_profiles_vat_number
    ON external_profiles (REPLACE(vat_number, ' ', ''))
    WHERE vat_number IS NOT NULL;

-- email format is validated at application level; keep index for lookups
CREATE INDEX IF NOT EXISTS idx_external_profiles_email
    ON external_profiles (LOWER(email));

-- base indexes
CREATE INDEX IF NOT EXISTS idx_external_profiles_type
    ON external_profiles (type);

CREATE INDEX IF NOT EXISTS idx_external_profiles_status
    ON external_profiles (status);

-- trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION set_external_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_external_profiles_updated_at ON external_profiles;
CREATE TRIGGER trg_external_profiles_updated_at
BEFORE UPDATE ON external_profiles
FOR EACH ROW EXECUTE FUNCTION set_external_profiles_updated_at();
