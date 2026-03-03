-- Migration: add start_at and end_at to bookings for precise usage window
-- Purpose: support business rule "cancellation allowed only if >24h before start time"
-- Timezone: stored as timestamptz (UTC) with application semantics Europe/Rome when creating values

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz;

-- Optional: backfill start_at for existing rows assuming start at 09:00 Europe/Rome
-- This keeps logic consistent for legacy all-day bookings. Adjust as needed per environment.
DO $$ BEGIN
  -- Only set if null
  UPDATE "bookings" b
  SET start_at = ((b.date::timestamp + time '09:00') AT TIME ZONE 'Europe/Rome')
  WHERE b.start_at IS NULL;
END $$;

-- Index to speed up queries filtering by start_at (e.g., upcoming bookings)
CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON "bookings"(start_at);
