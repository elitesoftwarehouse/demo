-- Migration: Create bookings table for desk reservations

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  desk_id TEXT NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint to prevent double booking same desk/day
CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_desk_day ON bookings (desk_id, date);

-- Optional: one booking per user per day (business rule - adjust if needed)
-- CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_user_day ON bookings (user_id, date);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION set_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_set_updated_at ON bookings;
CREATE TRIGGER bookings_set_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE PROCEDURE set_bookings_updated_at();
