# Booking cancellation rule - Technical note

Scope: Implement user-initiated booking cancellation from "Le Mie Prenotazioni" with 24h constraint.

Decision summary
- Reference timezone: UTC in database; application converts to tenant/coworking local tz (configurable, default Europe/Rome) for UI and rule evaluation. All persisted timestamps (created_at, updated_at, start_at, end_at, canceled_at) are TIMESTAMPTZ in UTC.
- Cancellation window rule: A standard user can cancel a booking only if now < start_at - 24 hours. Strict inequality (> 24h remaining). If start_at is null, derive from (date, time_slot) using business mapping; if still unknown, disallow self-cancellation.
- State handling: status remains domain status (PENDING/CONFIRMED/CANCELLED). state (ATTIVA/PASSATA/CANCELLATA) is used for UI filtering; when canceled, set status=CANCELLED, state=CANCELLATA, canceled_at=now(), canceled_by='USER'. For admin/operator, canceled_by='ADMIN'/'SYSTEM'. Optional cancellation_reason for auditing.
- Edge cases:
  - Timezone shifts (DST): compare using absolute instants (UTC). Compute start_at in UTC from local tz and time_slot rules; then compare with now() UTC.
  - Multiple time slots per day: store exact start_at/end_at per slot to avoid ambiguity.
  - No-show or post-usage: if now >= start_at, disallow cancel; booking transitions to PASSATA after end_at or date < now if start_at missing.
  - Soft vs hard delete: no hard delete; use status/state and canceled_at to preserve history and support billing/reporting.

Data model changes
- bookings table additions:
  - start_at TIMESTAMPTZ: exact usage start instant
  - end_at TIMESTAMPTZ: exact usage end instant (optional)
  - canceled_at TIMESTAMPTZ: when cancellation occurred
  - cancellation_reason VARCHAR(255): optional text
  - canceled_by VARCHAR(50): enum-like string: USER | ADMIN | SYSTEM
- Indices: idx_bookings_start_at (start_at), idx_bookings_canceled_at (canceled_at WHERE NOT NULL)

Derivation of start_at/end_at from legacy fields
- Existing fields: date (DATE) and time_slot (VARCHAR). The backend must map time_slot to a local start time. Example mapping (to implement centrally):
  - MORNING => 09:00-13:00
  - AFTERNOON => 14:00-18:00
  - FULL_DAY => 09:00-18:00
- Compute local ZonedDateTime from (date, slot) in Europe/Rome, then convert to UTC for start_at/end_at.

API/back-end impacts
- Cancel endpoint should:
  1) Load booking by id + user ownership; ensure status != CANCELLED.
  2) Ensure start_at is present; if null, compute from (date, time_slot) as per mapping.
  3) If now_utc < start_at_utc - 24h: allow; else reject with 409 and code BOOKING_CANNOT_CANCEL_WITHIN_24H.
  4) On success: set status=CANCELLED, state=CANCELLATA, canceled_at=now_utc, canceled_by='USER'. Keep record for uniqueness index (uq_booking_unique already ignores CANCELLED).
- Notifications: if email/SMS exists, send cancellation notice. No change required by this note.
- Billing/reporting: reports should exclude CANCELLED bookings by default; can include with filters. canceled_at supports timeframe reports (e.g., last month cancellations).

Frontend impacts
- Disable/hide cancel action for bookings with remaining time <= 24h based on start_at from API; avoid relying solely on frontend time computations.
- Display cancellation policy in UI.

Testing
- Unit: verify rule boundary conditions (just over 24h allowed; exactly 24h not allowed; within 24h not allowed).
- Integration: simulate user cancellation at different times; ensure state/status and timestamps set correctly and uniqueness works.
