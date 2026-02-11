-- Additional notes and optional backfill refinements for bookings.state
-- If the legacy schema uses different markers for cancellation, extend here.
-- Example: if status IN ('canceled','cancelled','annullata') treat as CANCELLATA

UPDATE bookings
SET state = 'CANCELLATA'
WHERE LOWER(COALESCE(status, '')) IN ('canceled', 'cancelled', 'annullata');
