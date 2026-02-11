-- Migration: add composite index for efficient user bookings queries
-- Ensures ordering/filtering by user_id and date is fast

CREATE INDEX IF NOT EXISTS bookings_user_date_idx ON bookings(user_id, date);
