# Spec Tecnica (Draft) — Pagina "Le Mie Prenotazioni"

Versione: 0.2
Data: 17/01/2026
Autore: Team Backend/Frontend
Stato: Proposta per validazione PO/Team

1) Stato attuale (repo)
- Backend: non esistono endpoints per elenco prenotazioni utente. Presenti solo:
  - /api/postazioni/status (stato 12 postazioni)
  - /api/calendar/disabled-dates (domeniche/festività)
- Frontend:
  - Pagina MyBookingsPage integra fetchMyBookings() con cursor (limit/cursor) e divisione future/past
  - bookingService.ts implementa createDeskBooking (stub); non esistono endpoint reali di lettura
- Modello dati DB: esiste tabella bookings e enum BookingState (PASSATA, ATTIVA, CANCELLATA + audit)

2) Modello Dati (Booking) — aggiornato
- Campi principali:
  - id: uuid (PK)
  - userId: uuid (FK -> users.id)
  - deskId: string (id postazione, es. "1".."12"); futuro: FK -> desks
  - date: DATE (prenotazione giornaliera; Europe/Rome)
  - startAt/endAt: timestamptz opzionali (UTC) — finestra utilizzo per policy cancellazione
  - stato: enum BookingState (PASSATA, ATTIVA, CANCELLATA, CANCELLATA_DA_UTENTE, CANCELLATA_DA_ADMIN)
  - cancelledAt + audit: cancelledByUserId, cancellationSource, cancellationReason
  - createdAt/updatedAt
- Vincoli/indici:
  - Unicità parziale su (deskId, date) per sole prenotazioni non cancellate (vedi migrazione 202601170300)
  - Indici su userId/date, startAt, cancelledAt

3) API di lettura (da creare)
- GET /api/bookings/me
  - Sicurezza: Authorization: Bearer; restituisce SOLO le prenotazioni dell’utente corrente
  - Query params (paginazione e filtri):
    - Keyset (preferito): limit (1..100, default 20), cursor, order (asc|desc), from (YYYY-MM-DD), to (YYYY-MM-DD), status (ATTIVA|PASSATA|CANCELLATA|ALL|NONE)
    - Page/Offset (alternativa): page (>=1, default 1), pageSize (1..100, default 20), sort (default "date"), order (asc|desc), from/to/status
  - Response:
    - Keyset: { items: [...], nextCursor?: string | null, hasNext?: boolean }
    - Page: { items: [...], page, pageSize, totalItems, totalPages, hasNext, hasPrevious }
  - Ordinamento: per date + id (tie-break), coerente con order

4) Regole di stato e business
- Stato applicativo esposto: ATTIVA, PASSATA, CANCELLATA
- Mapping su DB:
  - ATTIVA → stato='ATTIVA' e non cancellata
  - PASSATA → stato='PASSATA' oppure (stato='ATTIVA' e date < oggi) per compat legacy
  - CANCELLATA → stato IN ('CANCELLATA','CANCELLATA_DA_UTENTE','CANCELLATA_DA_ADMIN')
- Oggi determinato in Europe/Rome; usare BookingStatusService per coerenza, specie se startAt/endAt valorizzati

5) UX/Ordinamento
- Future: date >= oggi, order=asc
- Past: date < oggi, order=desc
- Il frontend mantiene due sezioni separate; l’API supporta entrambi i casi con from/to

6) Errori previsti
- 401/403, 400 parametri invalidi, 500 errori interni

7) Step
- Implementare endpoint e repository con keyset pagination; opzionale Page/Offset
- Aggiornare OpenAPI/Swagger documento di riferimento: docs/my-bookings-pagination-and-filtering.md

Riferimenti
- docs/my-bookings-pagination-and-filtering.md
- docs/booking-status-badges-ui-spec.md
