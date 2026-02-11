-- Booking table migrations: state persistence and soft-delete/audit columns
-- This script is safe to run multiple times thanks to IF NOT EXISTS checks

-- 1) Ensure state column exists to store derived state (PASSATA, ATTIVA, CANCELLATA)
ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS state TEXT;

-- 2) Add soft-delete/audit columns
ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_by UUID,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 3) Optional: index to speed up queries excluding canceled bookings
-- We keep bookings with state <> 'CANCELLATA' frequently filtered
CREATE INDEX IF NOT EXISTS idx_bookings_user_date_active
  ON bookings (user_id, date)
  WHERE state IS NULL OR state <> 'CANCELLATA';

CREATE INDEX IF NOT EXISTS idx_bookings_desk_date_active
  ON bookings (desk_id, date)
  WHERE state IS NULL OR state <> 'CANCELLATA';

-- 4) Optional: functional index on date for ordering by future/past buckets
CREATE INDEX IF NOT EXISTS idx_bookings_user_date
  ON bookings (user_id, date);

-- 5) Backfill state for existing rows if null
--   - If date < today (UTC), set PASSATA
--   - else set ATTIVA
--   - If cancellation audit already present, set CANCELLATA
DO $$
BEGIN
  -- If canceled_at exists and state is null or not 'CANCELLATA', mark as canceled
  UPDATE bookings
    SET state = 'CANCELLATA'
  WHERE canceled_at IS NOT NULL AND (state IS NULL OR state <> 'CANCELLATA');

  -- For remaining null state, compute based on date versus today (UTC)
  UPDATE bookings
    SET state = CASE WHEN date < (CURRENT_DATE AT TIME ZONE 'UTC')::date THEN 'PASSATA' ELSE 'ATTIVA' END
  WHERE state IS NULL;
END $$;

-- 6) Optional trigger to maintain state when cancel audit columns are updated
-- This keeps state = 'CANCELLATA' if canceled_at is set
CREATE OR REPLACE FUNCTION trg_bookings_ensure_canceled_state()
RETURNS trigger AS $$
BEGIN
  IF NEW.canceled_at IS NOT NULL THEN
    NEW.state := 'CANCELLATA';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_ensure_canceled_state ON bookings;
CREATE TRIGGER bookings_ensure_canceled_state
BEFORE INSERT OR UPDATE OF canceled_at ON bookings
FOR EACH ROW EXECUTE FUNCTION trg_bookings_ensure_canceled_state();

-- 7) Comments for documentation
COMMENT ON COLUMN bookings.state IS 'Derived/managed state: PASSATA, ATTIVA, CANCELLATA';
COMMENT ON COLUMN bookings.canceled_at IS 'Timestamp when booking was canceled (soft delete)';
COMMENT ON COLUMN bookings.canceled_by IS 'User who canceled the booking';
COMMENT ON COLUMN bookings.cancel_reason IS 'Reason for cancellation (free text or enum key)';
