-- V011__external_profiles_constraints.sql
-- Additional constraints and comments for external_profiles

COMMENT ON TABLE external_profiles IS 'Profili esterni per accreditamento: Professionista, Azienda, Collaboratore esterno';
COMMENT ON COLUMN external_profiles.type IS 'Tipologia profilo: PROFESSIONISTA | AZIENDA | COLLABORATORE_ESTERNO';
COMMENT ON COLUMN external_profiles.status IS 'Stato processo: DRAFT | IN_REVIEW | APPROVED | REJECTED';
COMMENT ON COLUMN external_profiles.fiscal_code IS 'Codice Fiscale (CF)';
COMMENT ON COLUMN external_profiles.vat_number IS 'Partita IVA (P.IVA)';
COMMENT ON COLUMN external_profiles.sdi_code IS 'Codice SDI fatturazione elettronica';
COMMENT ON COLUMN external_profiles.pec_email IS 'Email PEC';
