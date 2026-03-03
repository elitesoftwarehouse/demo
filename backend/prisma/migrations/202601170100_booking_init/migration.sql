-- Migration: init bookings table and booking state enum
-- Database: PostgreSQL
-- Notes:
-- - Introduces enum "BookingState" with values: PASSATA, ATTIVA, CANCELLATA
-- - Creates table bookings with default stato=ATTIVA
-- - Adds trigger for updated_at maintenance
-- - Backfills stato for existing rows (if any):
--     cancelled_at IS NOT NULL -> CANCELLATA
--     date < CURRENT_DATE -> PASSATA
--     else -> ATTIVA

-- Enum for booking state
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bookingstate') THEN
        CREATE TYPE "BookingState" AS ENUM ('PASSATA', 'ATTIVA', 'CANCELLATA');
    END IF;
END $$;

-- Table bookings
CREATE TABLE IF NOT EXISTS "bookings" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
    desk_id varchar(64) NOT NULL,
    date date NOT NULL,
    stato "BookingState" NOT NULL DEFAULT 'ATTIVA',
    cancelled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure column exists on legacy tables without stato
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS stato "BookingState" NOT NULL DEFAULT 'ATTIVA';

-- Backfill stato for existing rows according to business rules
UPDATE "bookings"
SET stato = CASE
    WHEN cancelled_at IS NOT NULL THEN 'CANCELLATA'::"BookingState"
    WHEN date < CURRENT_DATE THEN 'PASSATA'::"BookingState"
    ELSE 'ATTIVA'::"BookingState"
END;

-- Unique constraint on (desk_id, date) via unique index (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_desk_date ON "bookings"(desk_id, date);
-- Useful indices for queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON "bookings"(user_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_state_date ON "bookings"(user_id, stato, date);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_bookings_updated_at ON "bookings";
CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON "bookings"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
