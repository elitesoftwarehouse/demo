Spec tecnico — Pagina "Le Mie Prenotazioni" (frontend)
Versione: 0.9 (proposta da validare con PO) — 2026-01-17

Obiettivo UX
- Mostrare tutte le prenotazioni dell’utente in ordine cronologico con le più prossime in alto.
- Suddividere visivamente tra "Prossime" (oggi e future) e "Passate"; in alternativa, un’unica lista con indicatori di sezione.

Sorgenti dati e servizi
- Backend previsto: GET /bookings/my con filtri opzionali (from, to, status, page, pageSize, sort=chronological).
- Autenticazione: Authorization: Bearer <accessToken> (già gestita da httpClient + tokenStorage).

DTO atteso (BookingDto)
- id: string
- date: string (YYYY-MM-DD)
- stationId: string
- status: 'PENDING'|'CONFIRMED'|'CANCELLED'|'COMPLETED'
- timeSlot?: string | null
- createdAt: string (ISO)
- updatedAt: string (ISO)
- opzionali: stationName?, building?, floor?

Regole di ordinamento
- Default 'chronological':
  - Prima le prenotazioni future/odierne ordinate per date asc, poi timeSlot asc.
  - A seguire le prenotazioni passate, ordinate per date desc (per completezza nella stessa lista).
- UI: mostrare intestazioni di sezione "Prossime" e "Passate" se si usa una lista unica.

Paginazione
- page/pageSize (default 20). Caricamento progressivo con pulsante "Carica altre" o infinite scroll.
- Query di default: from=today-30d, to=today+365d per prestazioni e utilità; valori regolabili da UI.

Formati data e fuso orario
- Campo date è una data locale (YYYY-MM-DD) — non soggetta a TZ.
- Rendering: dd/MM/yyyy con locale it-IT.
- Per timeSlot o timestamp (createdAt): mostrare in Europe/Rome.

Componenti frontend (nuovi)
- features/my-bookings/myBookingsApi.ts
  - fetchMyBookings(params): chiama GET /bookings/my e restituisce items/total/paging.
- features/my-bookings/pages/MyBookingsPage.tsx
  - Pagina protetta che invoca l’API, gestisce stati (loading/error/empty) e rende la lista ordinata con intestazioni.
- features/my-bookings/components/BookingList.tsx
  - Presentational: riceve array di DTO e li raggruppa per sezione (future/past).

Edge cases
- Nessuna prenotazione: mostrare stato vuoto con call-to-action verso la Dashboard (mappa) per creare una prenotazione.
- Prenotazioni cancellate: includerle con label "Annullata" e stile attenuato; filtri status applicabili dall’utente (futuro enhancement).

Impatti su stile/UX
- Riutilizzare la tipografia e spacing esistenti; nessuna nuova dipendenza UI.

Prossimi passi
- Validare con PO: stati da mostrare, range di default, presenza/assenza timeSlot.
- Dopo conferma, implementare API backend + pagina frontend seguendo questo spec.
