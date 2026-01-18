-- Migration: add composite index on bookings (user_id, date)
-- Ensures efficient retrieval of bookings for a user ordered by date

CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings (user_id, date);
