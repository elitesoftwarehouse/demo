Badge mapping summary (shareable)

State | User label (it) | User label (en) | Tone | Icon | Notes
----- | ---------------- | --------------- | ---- | ---- | -----
ATTIVA | Attiva | Active | success | check-circle | Pill, small, right-aligned in table
PASSATA | Passata | Past | neutral | clock | Subtle neutral colors
CANCELLATA | Cancellata | Cancelled | danger | x-circle | Emphasize with red subtle background
UNKNOWN | Sconosciuta | Unknown | neutral | question-mark-circle | Fallback for future/unknown values

Accessibility
- aria-label pattern: "Stato prenotazione: {label}" (it), "Booking status: {label}" (en)
- Ensure WCAG AA contrast for text/background

Placement
- Table: status column, right-aligned, vertically centered
- Card: top-right corner or meta area below title

Sizing
- Font 12–14px; height 24–28px; padding 6–8px v, 10–12px h
