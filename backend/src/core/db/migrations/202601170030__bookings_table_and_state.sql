-- Migration: Create bookings table (if missing) and introduce booking_state (PASSATA, ATTIVA, CANCELLATA)
-- Date: 2026-01-17

-- 1) Enum booking_state
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_state') THEN
        CREATE TYPE booking_state AS ENUM ('PASSATA', 'ATTIVA', 'CANCELLATA');
    END IF;
END$$;

-- 2) If table bookings does not exist, create it with the new state column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bookings'
    ) THEN
        CREATE TABLE bookings (
            id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            station_id   text NOT NULL,
            date         date NOT NULL,
            time_slot    text NULL,
            state        booking_state NOT NULL DEFAULT 'ATTIVA',
            created_at   timestamptz NOT NULL DEFAULT now(),
            updated_at   timestamptz NOT NULL DEFAULT now()
        );

        COMMENT ON TABLE bookings IS 'Prenotazioni di postazioni (giornaliere o con time slot opzionale)';
        COMMENT ON COLUMN bookings.state IS 'Stato derivato a fini gestionali: PASSATA, ATTIVA, CANCELLATA';

        -- Indice per elenco prenotazioni dell''utente
        CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, date);

        -- Vincolo di unicità sulle prenotazioni ATTIVE per stessa postazione/data/slot
        -- Nota: partial unique index, consente duplicati per PASSATA/CANCELLATA
        CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_active_unique 
            ON bookings(station_id, date, COALESCE(time_slot, 'ALL'))
            WHERE state = 'ATTIVA';
    END IF;
END$$;

-- 3) If bookings table already exists, add the state column if missing and backfill values
DO $$
DECLARE
    col_state_exists boolean;
    col_status_exists boolean;
    col_cancelled_at_exists boolean;
    col_date_exists boolean;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bookings'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'state'
        ) INTO col_state_exists;

        IF NOT col_state_exists THEN
            EXECUTE 'ALTER TABLE bookings ADD COLUMN state booking_state NOT NULL DEFAULT ''ATTIVA''';
        END IF;

        -- Backfill logic for existing rows
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'status'
        ) INTO col_status_exists;

        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'cancelled_at'
        ) INTO col_cancelled_at_exists;

        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'date'
        ) INTO col_date_exists;

        IF col_status_exists THEN
            -- Map status CANCELLED/CANCELED to CANCELLATA
            EXECUTE $$UPDATE bookings SET state = 'CANCELLATA' WHERE (status = 'CANCELLED' OR status = 'CANCELED') AND state <> 'CANCELLATA'$$;
        END IF;

        IF col_cancelled_at_exists THEN
            -- If cancelled_at is present and set, mark as CANCELLATA
            EXECUTE $$UPDATE bookings SET state = 'CANCELLATA' WHERE cancelled_at IS NOT NULL AND state <> 'CANCELLATA'$$;
        END IF;

        IF col_date_exists THEN
            -- For past dates (strictly before today) not already cancelled, mark PASSATA
            EXECUTE $$UPDATE bookings SET state = 'PASSATA' WHERE state <> 'CANCELLATA' AND date < current_date$$;

            -- For today or future not cancelled, ensure ATTIVA
            EXECUTE $$UPDATE bookings SET state = 'ATTIVA' WHERE state <> 'CANCELLATA' AND date >= current_date$$;
        END IF;

        -- Ensure partial unique index exists (on ATTIVA)
        BEGIN
            EXECUTE $$CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_active_unique 
                     ON bookings(station_id, date, COALESCE(time_slot, 'ALL'))
                     WHERE state = 'ATTIVA'$$;
        EXCEPTION WHEN others THEN
            -- ignore failures in case of legacy schema differences
            NULL;
        END;

        -- Ensure user/date index exists
        BEGIN
            EXECUTE $$CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, date)$$;
        EXCEPTION WHEN others THEN
            NULL;
        END;
    END IF;
END$$;
