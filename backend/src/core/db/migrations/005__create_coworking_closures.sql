-- Migration: create coworking_closures table to manage closing days (single and recurring)
-- Safe for PostgreSQL

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'closure_type') THEN
    CREATE TYPE closure_type AS ENUM ('SINGLE', 'WEEKLY', 'ANNUAL');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS coworking_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type closure_type NOT NULL,
  -- For SINGLE closures (exact date)
  date DATE,
  -- For WEEKLY closures (0=Sunday ... 6=Saturday)
  weekday SMALLINT CHECK (weekday BETWEEN 0 AND 6),
  -- For ANNUAL closures (fixed day every year)
  month SMALLINT CHECK (month BETWEEN 1 AND 12),
  month_day SMALLINT CHECK (month_day BETWEEN 1 AND 31),

  reason VARCHAR(255),
  active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Optional activation window (applies only if date within range)
  start_date DATE,
  end_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Sanity checks per type
  CONSTRAINT coworking_closures_single_chk CHECK ((type <> 'SINGLE') OR (date IS NOT NULL)),
  CONSTRAINT coworking_closures_weekly_chk CHECK ((type <> 'WEEKLY') OR (weekday IS NOT NULL)),
  CONSTRAINT coworking_closures_annual_chk CHECK ((type <> 'ANNUAL') OR (month IS NOT NULL AND month_day IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_cw_closures_active ON coworking_closures(active);
CREATE INDEX IF NOT EXISTS idx_cw_closures_date ON coworking_closures(date) WHERE type = 'SINGLE';
CREATE INDEX IF NOT EXISTS idx_cw_closures_weekday ON coworking_closures(weekday) WHERE type = 'WEEKLY';
CREATE INDEX IF NOT EXISTS idx_cw_closures_annual ON coworking_closures(month, month_day) WHERE type = 'ANNUAL';

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION set_cw_closures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_cw_closures_updated_at ON coworking_closures;
CREATE TRIGGER trg_set_cw_closures_updated_at
BEFORE UPDATE ON coworking_closures
FOR EACH ROW
EXECUTE FUNCTION set_cw_closures_updated_at();

-- Seed standard weekend closures if missing (Saturday=6, Sunday=0)
INSERT INTO coworking_closures(type, weekday, reason, active)
SELECT 'WEEKLY', 6, 'Weekend (Saturday)', TRUE
WHERE NOT EXISTS (SELECT 1 FROM coworking_closures WHERE type = 'WEEKLY' AND weekday = 6);

INSERT INTO coworking_closures(type, weekday, reason, active)
SELECT 'WEEKLY', 0, 'Weekend (Sunday)', TRUE
WHERE NOT EXISTS (SELECT 1 FROM coworking_closures WHERE type = 'WEEKLY' AND weekday = 0);
