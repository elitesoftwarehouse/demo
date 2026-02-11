Booking state model

Overview
- Introduced explicit Booking.state with values: ATTIVA, PASSATA, CANCELLATA.
- State is managed by backend logic and stored in DB for efficient queries and consistency.

Compatibility
- Legacy field status ('confirmed' | 'pending' | 'canceled') remains for backward compatibility.
- Migration 0004 adds state column with default ATTIVA and backfills existing rows:
  - status = 'canceled' -> CANCELLATA
  - else if date < CURRENT_DATE -> PASSATA
  - else -> ATTIVA

Repository changes
- booking.repository.ts maps optional state from DB, defaulting to ATTIVA if absent.
- createBooking allows optional state; if omitted, DB default applies.

