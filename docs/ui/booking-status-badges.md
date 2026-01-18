Booking Status Badges - UX/UI Specification

Scope
- Define mapping between backend booking states and user-facing labels
- Provide UI guidelines for badge appearance and placement
- Define fallback behavior for unknown/future states
- Indicate i18n strategy for labels and accessible text

Authoritative backend states
- Source: prisma enum BookingState in backend/prisma/schema.prisma
  - PASSATA (past)
  - ATTIVA (active)
  - CANCELLATA (cancelled)

1) Mapping: backend state → user label (default locale: it-IT)
- PASSATA → "Passata"
- ATTIVA → "Attiva"
- CANCELLATA → "Cancellata"

Optional en-US reference (for i18n keys):
- PASSATA → "Past"
- ATTIVA → "Active"
- CANCELLATA → "Cancelled"

Suggested i18n keys (namespaced):
- booking.state.PASSATA
- booking.state.ATTIVA
- booking.state.CANCELLATA
- booking.state.UNKNOWN (fallback)

2) Badge UI guidelines
- Shape: pill (rounded full) to distinguish from table chips/tags; use a compact style.
- Size: small/compact, 12–14px font, 6–8px vertical padding, 10–12px horizontal padding; height ~24–28px.
- Typography: medium/semi-bold label for readability at small sizes.
- Iconography: optional 16px leading icon; see recommendations below.
- Placement:
  - Table row: right-aligned within the status column, vertically centered.
  - Card layout: top-right corner overlay or within meta area under title; maintain consistent spacing.
- Contrast & Accessibility: WCAG AA contrast for text vs background; include aria-label with full state label.

Color system (light theme; ensure dark theme variants exist):
- ATTIVA (success)
  - Background: #E6F7EC (success-50)
  - Border: #A8E6BC (success-300) optional 1px
  - Text: #107A3E (success-700)
  - Icon: check-circle (optional)
- PASSATA (neutral/info subtle)
  - Background: #F1F5F9 (slate-100)
  - Border: #CBD5E1 (slate-300) optional 1px
  - Text: #475569 (slate-600)
  - Icon: clock (optional)
- CANCELLATA (danger)
  - Background: #FEE2E2 (red-100)
  - Border: #FCA5A5 (red-300) optional 1px
  - Text: #B91C1C (red-700)
  - Icon: x-circle (optional)

Dark theme tokens (guideline; map to design system tokens if available):
- ATTIVA: bg #0B2A19, text #9AE6B4, border #14532D
- PASSATA: bg #0F172A, text #CBD5E1, border #334155
- CANCELLATA: bg #2A0B0B, text #FCA5A5, border #7F1D1D

Icon suggestions
- ATTIVA: check-circle
- PASSATA: clock / history
- CANCELLATA: x-circle / ban

3) Fallback behavior (unknown/future states)
- If state is unrecognized, render a neutral badge:
  - Label: i18n key booking.state.UNKNOWN → "Sconosciuta"
  - Background: #E5E7EB (gray-200), Text: #374151 (gray-700), Border: #D1D5DB (gray-300)
  - Icon: question-mark-circle
  - Also log (debug level) the unexpected state value to help telemetry, without breaking UI.

4) i18n support
- Use i18n keys defined above; do not hardcode labels in components.
- Provide translations at least for it-IT and en-US.
- For accessibility, set aria-label to the localized full label, e.g., aria-label="Stato prenotazione: Attiva".
- Consider abbreviations only on very narrow screens; when truncated, keep full label in title attribute.

5) Component API proposal (for implementation reference)
- <BookingStatusBadge state="ATTIVA" />
  - Props:
    - state: one of backend enum values (string)
    - size?: 'sm' | 'md' (default 'sm')
    - withIcon?: boolean (default true)
    - className?: string (optional)
  - Renders correct colors, icon, and localized label via i18n.

6) QA acceptance checklist
- Labels match mapping for all 3 known states.
- Badge colors meet contrast AA in both light and dark themes.
- Fallback renders for unknown values with neutral style.
- i18n works for it-IT/en-US and aria-label is present.
- Badge fits in table rows and card headers without layout shift.

Appendix: Design tokens mapping (example)
- success-bg-subtle, success-fg, success-border
- danger-bg-subtle, danger-fg, danger-border
- neutral-bg-subtle, neutral-fg, neutral-border

Notes
- This document is a pre-dev spec; engineering can create a shared mapping file to avoid drift between backend values and frontend rendering.
