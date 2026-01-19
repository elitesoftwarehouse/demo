-- SmartDesk - Schema iniziale per POSTAZIONE e PRENOTAZIONE_POSTAZIONE (PostgreSQL)
-- Data: 2026-01-19

-- NOTA: Adeguare i nomi schema/tabella utente secondo il progetto reale.
-- Questo script assume una tabella users(id uuid primary key) già esistente.

BEGIN;

-- Estensione per UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabella POSTAZIONE
CREATE TABLE IF NOT EXISTS postazione (
  id SERIAL PRIMARY KEY,
  codice TEXT NOT NULL UNIQUE,
  row_index INT NOT NULL,
  col_index INT NOT NULL,
  attiva BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_postazione_updated_at ON postazione;
CREATE TRIGGER trg_postazione_updated_at
BEFORE UPDATE ON postazione
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tabella PRENOTAZIONE_POSTAZIONE
CREATE TABLE IF NOT EXISTS prenotazione_postazione (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  postazione_id INT NOT NULL REFERENCES postazione(id) ON DELETE RESTRICT,
  data DATE NOT NULL,
  stato TEXT NOT NULL DEFAULT 'ATTIVA', -- ATTIVA | CANCELLATA
  cancel_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ NULL,
  CONSTRAINT ck_prenotazione_stato CHECK (stato IN ('ATTIVA', 'CANCELLATA')),
  CONSTRAINT fk_prenotazione_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Trigger per updated_at
DROP TRIGGER IF EXISTS trg_prenotazione_updated_at ON prenotazione_postazione;
CREATE TRIGGER trg_prenotazione_updated_at
BEFORE UPDATE ON prenotazione_postazione
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indici di supporto
CREATE INDEX IF NOT EXISTS ix_prenotazione_user_data ON prenotazione_postazione(user_id, data);
CREATE INDEX IF NOT EXISTS ix_prenotazione_postazione_data ON prenotazione_postazione(postazione_id, data);

-- Vincoli di unicità parziali per prenotazioni ATTIVE (PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_per_day_active
ON prenotazione_postazione(user_id, data)
WHERE stato = 'ATTIVA';

CREATE UNIQUE INDEX IF NOT EXISTS uq_postazione_per_day_active
ON prenotazione_postazione(postazione_id, data)
WHERE stato = 'ATTIVA';

COMMIT;
