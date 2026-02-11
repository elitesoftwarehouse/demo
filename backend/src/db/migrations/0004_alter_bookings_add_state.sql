-- Migration: Add state column to bookings and backfill values
-- States: PASSATA (past), ATTIVA (active), CANCELLATA (canceled)

-- 1) Add column if not exists with default ATTIVA for future compat
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS state VARCHAR(16) NOT NULL DEFAULT 'ATTIVA';

-- 2) Ensure only allowed values (using CHECK) - add only if not existing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_state_check'
      AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_state_check
      CHECK (state IN ('PASSATA', 'ATTIVA', 'CANCELLATA'));
  END IF;
END $$;

-- 3) Backfill existing records based on available info
-- Assumptions:
--  - Table has columns: date (DATE) and status (legacy) where 'canceled' denotes cancellation
--  - For rows with status = 'canceled' => CANCELLATA
--  - Else if date < CURRENT_DATE => PASSATA
--  - Else => ATTIVA

UPDATE bookings
SET state = 'CANCELLATA'
WHERE (status IS NOT NULL AND LOWER(status) = 'canceled');

UPDATE bookings
SET state = 'PASSATA'
WHERE (status IS NULL OR LOWER(status) <> 'canceled')
  AND date < CURRENT_DATE;

UPDATE bookings
SET state = 'ATTIVA'
WHERE state IS DISTINCT FROM 'CANCELLATA'
  AND date >= CURRENT_DATE;

-- 4) Consider creating an index to query by state
CREATE INDEX IF NOT EXISTS bookings_state_idx ON bookings(state);
