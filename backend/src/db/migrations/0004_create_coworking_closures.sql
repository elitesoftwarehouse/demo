-- Migration: Create coworking_closures table to manage closed days (single and recurring)
-- Purpose: Allow configuration of recurring closures (e.g., weekends) and one-off closures (holidays, events)

-- Ensure UUID extension is available (already created in 0001 but safe to include)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS coworking_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(16) NOT NULL CHECK (type IN ('single', 'recurring')),
  -- Single-date closure: use date field (UTC date, no time)
  date DATE NULL,
  -- Recurring closure fields: day of week (0=Sunday .. 6=Saturday) and optional active window
  day_of_week SMALLINT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_date DATE NULL,
  end_date DATE NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes to speed up lookups
CREATE INDEX IF NOT EXISTS coworking_closures_date_idx ON coworking_closures(date);
CREATE INDEX IF NOT EXISTS coworking_closures_dow_idx ON coworking_closures(day_of_week);
CREATE INDEX IF NOT EXISTS coworking_closures_range_idx ON coworking_closures(start_date, end_date);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION set_updated_at_timestamp_coworking_closures()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coworking_closures_set_updated_at ON coworking_closures;
CREATE TRIGGER coworking_closures_set_updated_at
BEFORE UPDATE ON coworking_closures
FOR EACH ROW EXECUTE PROCEDURE set_updated_at_timestamp_coworking_closures();

-- Optional seed: mark Saturdays as recurring closure if desired (example)
-- INSERT INTO coworking_closures (type, day_of_week, reason) VALUES ('recurring', 6, 'Chiusura Sabato');
