API Prenotazioni SmartDesk - Modello Dati e Contratti

Schema dati (in-memory, target Prisma)
- Desk (Postazione)
  - id: number (PK)
  - code: string (unique)
  - label: string
  - row: number (1..2)
  - col: number (1..3)
  - active: boolean

- Booking (PrenotazionePostazione)
  - id: string (uuid, PK)
  - userId: string (FK -> User.id)
  - deskId: number (FK -> Desk.id)
  - date: string (YYYY-MM-DD, canonicalizzata, unique per (deskId, date) e per (userId, date))
  - status: 'ACTIVE' | 'CANCELLED'
  - createdAt: Date
  - updatedAt: Date
  - cancelledReason?: string

Regole di business
- Solo giorni feriali (Lun-Ven)
- Massimo 1 prenotazione per utente per data
- Una postazione può avere al massimo 1 prenotazione per data
- Cancellazione consentita solo >24h prima dell'inizio del giorno prenotato
- Solo l'utente proprietario può cancellare la propria prenotazione

Endpoint REST
- GET /bookings/map?date=YYYY-MM-DD
  - Auth: Bearer
  - Response 200:
    {
      date: '2026-01-20',
      desks: [
        { id, code, label, row, col, active, occupied, myBooking, bookingId? }
      ]
    }
  - Errori: 400 (data invalida)

- POST /bookings
  - Body: { deskId: number, date: 'YYYY-MM-DD' }
  - Response 201: BookingEntity
  - Errori: 400 (festivo), 404 (postazione non disponibile), 409 (vincoli di unicità)

- DELETE /bookings/:id (o PUT /bookings/:id/cancel)
  - Body: { reason?: string }
  - Response 200: BookingEntity (status=CANCELLED)
  - Errori: 404 (non trovata), 403 (altro utente), 400 (entro 24h)

Note privacy mappa
- L'endpoint mappa non espone userId del prenotante; espone bookingId solo se la prenotazione è dell'utente loggato o se ruolo ADMIN.
