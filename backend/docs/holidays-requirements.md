Holidays and Closed Days — Backend validation requirements
Version: 1.0 — 2026-01-17

Scope
- Provide a single source of truth for closed days used by booking validation.
- Support national fixed holidays (Italy), Easter Monday (mobile), Sundays, and configurable local/extra closures.

Decisions
- Fixed national holidays hardcoded for stability; local/extra via configuration (file → DB later).
- Rolling window: current year + next year precomputed in memory.
- Feature flag HOLIDAYS_STRICT_MODE (default true): when false, only warn but do not block (useful in demo/dev).
- Expose service API (to be implemented in a subsequent task):
  - isClosed(date: LocalDate): { closed: boolean; code?: string; name?: string }
  - listClosedDates(year: number): Array<{ date: string; code: string; name: string }>

National fixed holidays (recurring every year)
- 01-01 Capodanno
- 01-06 Epifania
- 04-25 Liberazione
- 05-01 Lavoro
- 06-02 Repubblica
- 08-15 Ferragosto (Assunzione)
- 11-01 Ognissanti
- 12-08 Immacolata
- 12-25 Natale
- 12-26 Santo Stefano

Mobile holiday
- Easter Monday (Pasquetta): Monday following Easter Sunday (Gregorian). Always closed.

Local/extra closures (configurable)
- Support "recurring" (day/month) and "one-off" (ISO date) items, with fields: id, name, type, active, optional notes, and source.

Modules affected
- Booking creation/update endpoints must validate using the service.
- Future endpoint GET /calendar/closed?year=YYYY to allow UI to preload disabled dates.

Testing guidelines
- Unit tests for Easter calculation across sample years.
- Validation tests for Sundays, fixed holidays, configured local closures.
