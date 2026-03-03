-- Migration: booking cancellation audit and soft-delete semantics
-- Purpose:
--  - Distinguish cancellation actor (user/admin/system)
--  - Optionally refine booking state to include CANCELLATA_DA_UTENTE and CANCELLATA_DA_ADMIN
--  - Add audit columns: cancelled_by_user_id, cancellation_source, cancellation_reason
--  - Update uniqueness to ignore cancelled bookings (partial unique index)
--  - Add helpful indices for reporting
--
-- Rollout & safety notes:
--  - This script is idempotent where possible (IF NOT EXISTS; conditional updates).
--  - Dropping the legacy unique index on (desk_id, date) allows re-booking a desk on a date if previous booking was cancelled.
--  - A new partial unique index enforces uniqueness only for non-cancelled bookings.
--  - Rollback: drop the partial index and recreate the legacy unique index (see bottom comments).

-- 1) Add enum CancellationSource if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancellationsource') THEN
    CREATE TYPE "CancellationSource" AS ENUM ('USER', 'ADMIN', 'SYSTEM');
  END IF;
END $$;

-- 2) Extend BookingState with more specific cancelled states (optional, backward compatible)
DO $$ BEGIN
  -- Add value CANCELLATA_DA_UTENTE
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'bookingstate' AND e.enumlabel = 'CANCELLATA_DA_UTENTE'
  ) THEN
    ALTER TYPE "BookingState" ADD VALUE 'CANCELLATA_DA_UTENTE';
  END IF;
  -- Add value CANCELLATA_DA_ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'bookingstate' AND e.enumlabel = 'CANCELLATA_DA_ADMIN'
  ) THEN
    ALTER TYPE "BookingState" ADD VALUE 'CANCELLATA_DA_ADMIN';
  END IF;
END $$;

-- 3) Add audit columns (nullable)
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id uuid REFERENCES "users"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_source "CancellationSource",
  ADD COLUMN IF NOT EXISTS cancellation_reason varchar(255);

-- 4) Backfill cancellation_source and refined stato where applicable
DO $$ BEGIN
  -- Default cancellation_source to USER when cancelled_at is present but source is null
  UPDATE "bookings"
  SET cancellation_source = 'USER'::"CancellationSource"
  WHERE cancelled_at IS NOT NULL AND cancellation_source IS NULL;

  -- Refine stato based on cancellation_source when row is currently marked as cancelled
  UPDATE "bookings"
  SET stato = CASE
    WHEN cancellation_source = 'USER' THEN 'CANCELLATA_DA_UTENTE'::"BookingState"
    WHEN cancellation_source = 'ADMIN' THEN 'CANCELLATA_DA_ADMIN'::"BookingState"
    ELSE 'CANCELLATA'::"BookingState"
  END
  WHERE cancelled_at IS NOT NULL AND (stato = 'CANCELLATA' OR stato = 'ATTIVA');
END $$;

-- 5) Replace legacy unique index with partial unique excluding cancelled records
-- Drop old unique index if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = ANY (current_schemas(false)) AND indexname = 'uq_bookings_desk_date'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS "uq_bookings_desk_date"';
  END IF;
END $$;

-- Create new partial unique index to enforce uniqueness only when not cancelled
-- Note: cannot use CONCURRENTLY inside a transaction; ensure your migration runner handles this accordingly if needed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_desk_date_active
ON "bookings"(desk_id, date)
WHERE stato <> 'CANCELLATA' AND stato <> 'CANCELLATA_DA_UTENTE' AND stato <> 'CANCELLATA_DA_ADMIN';

-- 6) Helpful indices for reporting & filters
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON "bookings"(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_source ON "bookings"(cancellation_source);
CREATE INDEX IF NOT EXISTS idx_bookings_user_cancelled ON "bookings"(user_id, cancelled_at);

-- Rollback guidance (manual):
--  - DROP INDEX IF EXISTS uq_bookings_desk_date_active;
--  - CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_desk_date ON "bookings"(desk_id, date);
--  - Optional: keep the new columns as they are additive, or set stato back to 'CANCELLATA' where refined.
