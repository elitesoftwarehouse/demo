# API Prenotazioni Postazioni - Specifica e Stub Frontend

Versione: 0.1 (stub)
Data: 17/01/2026
Autore: Frontend Team
Stato: Draft (in attesa di conferma dal Backend)

Scopo
- Definire l'interfaccia minima per creare una prenotazione di postazione dal frontend e il formato di risposta atteso.
- Predisporre uno stub lato frontend per consentire il completamento del flusso UI anche in assenza dell'endpoint reale.

Endpoint ipotizzati
1) POST /api/desks/{id}/book
   - Body: { date: "YYYY-MM-DD", userId: "<uuid>" }
   - Response 200: { bookingId: string, status: "CONFIRMED"|"PENDING", deskId: string, date: "YYYY-MM-DD" }
   - Errori:
     - 401/403: non autorizzato
     - 409: conflitto (postazione già prenotata)
     - 422: validazione (data non valida, domenica/festività)

2) Fallback POST /api/bookings/desks
   - Body: { deskId: string, date: "YYYY-MM-DD", userId: string }
   - Response/Errors come sopra

Interfaccia frontend
- File: frontend/src/services/bookingService.ts
- Funzione: createDeskBooking(request, options)
  - request: { deskId, date, userId }
  - options: { token?, endpoint?, preferApi? = true }
  - Ritorna: Promise<{ bookingId, status, deskId, date }>
  - Comportamento: tenta endpoint reale (primary/fallback). Se 404/non presente, usa stub che simula conferma.

Comportamento Stub
- Simula errore 422 se la data è nel passato o formato errato.
- Simula errore 409 se l'id postazione termina con '0' (utile per test dei percorsi di errore).
- Diversamente, ritorna status "CONFIRMED" con bookingId fittizio.

Integrazione UI
- DashboardPostazioni collega il pulsante "Conferma" del popup a createDeskBooking.
- In caso di successo: chiude il popup, richiama reload della mappa per aggiornare gli stati.
- In caso di errore (409/422/401+): mostra messaggio nel popup senza chiudere.

Note di sicurezza
- Richiesta autenticazione tramite Authorization: Bearer <access_token> quando disponibile.
- In attesa definizione server-side di validazioni aggiuntive (timezone Europe/Rome, blocco domeniche/festività, idempotenza via header o jti opzionale).

Prossimi passi Backend
- Confermare URI definitivo e payload.
- Restituire 201 Created con Location opzionale (/api/bookings/{id}).
- Definire schema OpenAPI per integrazione completa.
