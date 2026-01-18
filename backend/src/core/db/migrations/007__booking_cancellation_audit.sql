-- Migration: booking cancellation audit and state management
-- Purpose: support soft-delete-like behavior and audit for cancellations
-- Safe for PostgreSQL

-- 1) Extend booking_state with specific cancellation state for user-driven cancellations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'booking_state' AND e.enumlabel = 'CANCELLATA_DA_UTENTE'
  ) THEN
    ALTER TYPE booking_state ADD VALUE 'CANCELLATA_DA_UTENTE';
  END IF;
END$$;

-- 2) Adjust unique constraint for active bookings to ignore cancelled ones
--    We drop the previous index (if any) and create a new partial unique index
--    that only applies to non-cancelled (active) bookings.
--    Rationale: cancellations should free the desk/time_slot for reuse.
DROP INDEX IF EXISTS uq_booking_unique;
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_unique_active ON bookings(desk_id, date, time_slot)
WHERE canceled_at IS NULL AND (state <> 'CANCELLATA' AND state <> 'CANCELLATA_DA_UTENTE');

-- 3) Trigger to automatically set state upon cancellation, preserving audit intent
--    If canceled_by looks like a user-driven cancellation (e.g., 'USER' or 'USER:*'),
--    set state = 'CANCELLATA_DA_UTENTE'; otherwise fallback to generic 'CANCELLATA'.
CREATE OR REPLACE FUNCTION set_bookings_state_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- On insert/update: when a cancellation timestamp is present, update state accordingly
  IF NEW.canceled_at IS NOT NULL THEN
    -- Only override if state is not already a cancellation state
    IF NEW.state NOT IN ('CANCELLATA', 'CANCELLATA_DA_UTENTE') THEN
      IF NEW.canceled_by = 'USER' OR NEW.canceled_by ILIKE 'USER:%' THEN
        NEW.state := 'CANCELLATA_DA_UTENTE';
      ELSE
        NEW.state := 'CANCELLATA';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_bookings_state_on_cancel ON bookings;
CREATE TRIGGER trg_set_bookings_state_on_cancel
BEFORE INSERT OR UPDATE OF canceled_at, canceled_by ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_bookings_state_on_cancel();

-- 4) Backfill: update existing rows where a cancellation is already present
--    and state is not aligned with the new detailed cancellation state
UPDATE bookings b
SET state = CASE
  WHEN b.canceled_at IS NOT NULL AND (b.canceled_by = 'USER' OR b.canceled_by ILIKE 'USER:%') THEN 'CANCELLATA_DA_UTENTE'
  WHEN b.canceled_at IS NOT NULL THEN 'CANCELLATA'
  ELSE b.state
END
WHERE b.canceled_at IS NOT NULL AND b.state NOT IN ('CANCELLATA', 'CANCELLATA_DA_UTENTE');

-- Notes for rollout:
-- - This migration is idempotent where possible (checks for enum value existence, IF EXISTS on drop).
-- - Adding enum values in PostgreSQL is not easily reversible; a rollback should be planned as a full restore if needed.
-- - The previous unique index name 'uq_booking_unique' is replaced by 'uq_booking_unique_active'; components referencing the old index name should be updated accordingly in ORM mappings.
