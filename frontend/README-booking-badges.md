Booking Status Badges - Frontend Notes

Purpose
- Align UI with backend BookingState values and provide a single mapping source.

Backend enum (source of truth)
- BookingState: PASSATA | ATTIVA | CANCELLATA

Recommended implementation steps
- Create a BookingStatusBadge component that accepts backend state values directly.
- Centralize mapping in a const map:
  const BOOKING_BADGE_MAP = {
    ATTIVA: { i18nKey: 'booking.state.ATTIVA', tone: 'success', icon: 'check-circle' },
    PASSATA: { i18nKey: 'booking.state.PASSATA', tone: 'neutral', icon: 'clock' },
    CANCELLATA: { i18nKey: 'booking.state.CANCELLATA', tone: 'danger', icon: 'x-circle' },
    UNKNOWN: { i18nKey: 'booking.state.UNKNOWN', tone: 'neutral', icon: 'question-mark-circle' },
  } as const;

- Tone → design tokens
  - success: bg success-bg-subtle, text success-fg, border success-border
  - danger: bg danger-bg-subtle, text danger-fg, border danger-border
  - neutral: bg neutral-bg-subtle, text neutral-fg, border neutral-border

- Props proposal
  type Props = {
    state: 'ATTIVA' | 'PASSATA' | 'CANCELLATA' | string;
    size?: 'sm' | 'md';
    withIcon?: boolean;
    className?: string;
  };

- Behavior
  - If state not in map, fall back to UNKNOWN.
  - Use i18n t() with provided i18nKey; avoid hardcoded strings.
  - Add aria-label: `t('booking.badge.aria', { state: t(map.i18nKey) })` with default "Stato prenotazione: {state}".

- Placement guidance
  - Table: right-aligned in a Status column; ensure no wrap unless necessary.
  - Card: top-right corner or meta section; keep vertical rhythm.

- Testing
  - Snapshot rendering for all known states and unknown.
  - Verify correct i18n key usage and conditional icon visibility.

- Translations (example)
  it:
    booking:
      state:
        ATTIVA: "Attiva"
        PASSATA: "Passata"
        CANCELLATA: "Cancellata"
        UNKNOWN: "Sconosciuta"
      badge:
        aria: "Stato prenotazione: {{state}}"
  en:
    booking:
      state:
        ATTIVA: "Active"
        PASSATA: "Past"
        CANCELLATA: "Cancelled"
        UNKNOWN: "Unknown"
      badge:
        aria: "Booking status: {{state}}"
