-- Migration: Alter bookings to add cancellation audit fields
-- Date: 2026-01-17

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bookings'
    ) THEN
        -- Add columns if not exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'cancelled_at'
        ) THEN
            EXECUTE 'ALTER TABLE bookings ADD COLUMN cancelled_at timestamptz NULL';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'cancelled_by'
        ) THEN
            EXECUTE 'ALTER TABLE bookings ADD COLUMN cancelled_by uuid NULL REFERENCES users(id) ON DELETE SET NULL';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'cancel_reason'
        ) THEN
            EXECUTE 'ALTER TABLE bookings ADD COLUMN cancel_reason text NULL';
        END IF;

        -- Optional index to query cancellations by time
        BEGIN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at)';
        EXCEPTION WHEN others THEN
            NULL;
        END;
    END IF;
END$$;

COMMENT ON COLUMN bookings.cancelled_at IS 'Timestamp of cancellation (soft cancel audit)';
COMMENT ON COLUMN bookings.cancelled_by IS 'User who performed the cancellation (null if system)';
COMMENT ON COLUMN bookings.cancel_reason IS 'Optional cancellation reason';
