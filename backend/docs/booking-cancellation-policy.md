Booking cancellation policy — Technical note
Version: 1.0 — 2026-01-17

Context
- Feature: user-initiated cancellation from "Le Mie Prenotazioni" with a strict 24h rule.
- Current model stores: date (DATE), optional timeSlot (TEXT), state (booking_state: PASSATA|ATTIVA|CANCELLATA), timestamps (created_at, updated_at).
- There is no explicit startAt/endAt timestamptz. Business day/time is derived from date + timeSlot.

Decision summary
- Time zone of reference: Europe/Rome for all comparisons and interpretations of booking date/time.
- Booking start time:
  - If timeSlot provided, we parse its start (supported formats: 'HH-HH', 'HH:MM-HH:MM', 'AM', 'PM', 'ALL'/'FULL').
  - If no timeSlot, we consider full-day with default start at 08:00 local time (configurable per service via defaultStartMin, default 480 minutes).
- Cancellation rule: the user can cancel only if now < (start - 24h). Strictly more than 24 hours before start.
  - Edge cases: exactly 24h before is NOT allowed; 24h + 1 minute before is allowed.
- Comparison logic implemented in BookingCancellationPolicy.ts (pure domain):
  - computeBookingStartInstant(dateIso, timeSlot, options) → Date instant representing the start
  - isCancelableByUser(dateIso, timeSlot, options) → boolean applying the >24h threshold

Model data updates (proposed)
- To audit cancellations and enable reporting, add optional columns:
  - cancelled_at timestamptz NULL — when the booking was cancelled
  - cancelled_by uuid NULL REFERENCES users(id) ON DELETE SET NULL — who performed the cancellation (user/admin)
  - cancel_reason text NULL — optional justification (enum in future)
- State transitions:
  - On cancellation, set state = 'CANCELLATA' and cancelled_at = now(), plus cancelled_by if available.
  - Keep the row (soft cancellation). Do not delete rows to preserve auditability and billing history.
- Impact on indexes/uniqueness: partial unique index already excludes non-ATTIVA rows, so cancelled rows allow new active bookings for the same station/date/slot.

DB migration impact
- Add a new migration to alter bookings table with the three cancellation-related columns (nullable). Backfill not required.
- Update any backfill scripts to set state = 'CANCELLATA' where cancelled_at IS NOT NULL (already handled in previous migration).

Module impacts
- API/Service layer: introduce a cancel booking use case that:
  1) Validates ownership (user must own the booking)
  2) Validates isCancelableByUser(date, timeSlot) with tz = Europe/Rome and configured defaults
  3) Performs state transition to CANCELLATA and fills cancelled_at/by/reason
  4) Emits domain events/notifications if needed
- Reporting: can filter by state and cancelled_at for metrics.
- Billing: cancellation window might determine refund rules; downstream logic can inspect cancelled_at vs start time.
- Notifications: send confirmation of cancellation and possibly notify admins if within tight windows.

Edge cases and clarifications
- Daylight saving time changes are handled by interpreting start time in Europe/Rome; threshold uses absolute milliseconds difference. For days with DST transitions, the '24h' compares true elapsed time.
- Bookings without timeSlot are treated as full-day starting at 08:00; adjust defaultStartMin if business hours differ.
- If timeSlot format is unknown, default to full-day start time.
- Server time vs application time: use UTC system clock but always compute the start instant in Europe/Rome before applying the 24h threshold.

Testing
- Unit tests to cover boundary conditions:
  - now = start - 24h → false
  - now = start - 24h - 1ms → false
  - now = start - 24h - 1min → false
  - now = start - 24h + 1ms → true
  - morning/evening slots (AM/PM), HH-HH and HH:MM-HH:MM formats
  - DST boundary dates (last Sunday of March/October)
