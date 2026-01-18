-- Migration: alter bookings to add start/end timestamps and cancellation metadata
-- Purpose: support 24h cancellation rule based on exact usage start time
-- Safe for PostgreSQL

-- Add columns if not exist
ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS canceled_by VARCHAR(50);

-- Indexes to support lookups
CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_canceled_at ON bookings(canceled_at) WHERE canceled_at IS NOT NULL;

-- Note: we intentionally do NOT backfill start_at/end_at here because time_slot semantics may vary.
-- Backend should compute start_at/end_at for new bookings from (date, time_slot) using application rules
-- and optionally backfill existing rows in a controlled migration once rules are finalized.
