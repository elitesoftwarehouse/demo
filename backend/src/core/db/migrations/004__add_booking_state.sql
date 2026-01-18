-- Migration: add booking_state enum and state column on bookings
-- Safe for PostgreSQL

DO $$
BEGIN
  -- Create enum type if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'booking_state') THEN
    CREATE TYPE booking_state AS ENUM ('PASSATA', 'ATTIVA', 'CANCELLATA');
  END IF;
END$$;

-- Add column state to bookings with default 'ATTIVA' if not exists
ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS state booking_state NOT NULL DEFAULT 'ATTIVA';

-- Backfill existing data
-- Rules:
-- - If status = 'CANCELLED' => state = 'CANCELLATA'
-- - Else if date < now() => state = 'PASSATA'
-- - Else => 'ATTIVA'
UPDATE bookings b
SET state = CASE
  WHEN b.status = 'CANCELLED' THEN 'CANCELLATA'
  WHEN b.date < now() THEN 'PASSATA'
  ELSE 'ATTIVA'
END;

-- Optional index for querying by state
CREATE INDEX IF NOT EXISTS idx_bookings_state ON bookings(state);
