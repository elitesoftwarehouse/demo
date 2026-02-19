SmartDesk - Modello Dati e API Prenotazioni (2x3)

Versione: 1.0
Data: 19/01/2026

1) Modello Dati (proposta Prisma)

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  name         String
  bookings     Booking[]
  createdAt    DateTime  @default(now())
}

model Desk {
  id       Int       @id @default(autoincrement())
  code     String    @unique     // es. D1..D6
  row      Int                     // 0..1 per mappa 2x3
  col      Int                     // 0..2 per mappa 2x3
  active   Boolean   @default(true)
  bookings Booking[]
}

model Booking {
  id            String   @id @default(uuid())
  user          User     @relation(fields: [userId], references: [id])
  userId        String
  desk          Desk     @relation(fields: [deskId], references: [id])
  deskId        Int
  date          DateTime @db.Date           // solo data (00:00 locale)
  status        String   @default("ACTIVE") // ACTIVE | CANCELLED
  cancelReason  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, date])                  // 1 prenotazione per utente al giorno
  @@unique([deskId, date])                  // 1 prenotazione per postazione al giorno
}

// Estensione per calendario lavorativo (opzionale)
model Holiday {
  id        Int      @id @default(autoincrement())
  date      DateTime @db.Date @unique
  name      String
}

Note progettuali:
- La mappa 2x3 è rappresentata da 6 Desk (row: 0..1, col: 0..2). Il campo active abilita/disabilita la postazione.
- Booking.status permette cancellazione logica (CANCELLED). updatedAt traccia l'ultima modifica.
- Holiday consente di marcare festività; i giorni feriali si calcolano Lun-Ven escludendo le date presenti in Holiday.

2) Business Rules
- Prenotazioni consentite solo in giorni feriali (Lun-Ven) e non festivi.
- 1 prenotazione per utente per data (vincolo applicativo e DB @@unique([userId, date])).
- 1 prenotazione per postazione per data (vincolo applicativo e DB @@unique([deskId, date])).
- Cancellazione consentita solo oltre 24 ore prima dell'inizio della data prenotata (00:00 locale della data).
- Privacy: nella mappa, indicare solo se occupata e se occupata dall'utente corrente (isMe). Non esporre l'identità di altri utenti.

3) API REST (contratti)

3.1 GET /bookings/map?date=YYYY-MM-DD
Auth: Bearer JWT
Request:
  query: { date: string(YYYY-MM-DD) }
Response 200:
{
  date: "2026-01-22",
  desks: [
    {
      desk: { id: 1, code: "D1", row: 0, col: 0, active: true },
      status: "FREE" | "OCCUPIED",
      occupant?: { isMe: boolean, userId?: string }
    },
    ... x6
  ]
}
Errori:
- 400 INVALID_QUERY / DATE_INVALID
- 422 NON_WORKING_DAY (se si decide di bloccare anche in lettura; opzionale) 

3.2 POST /bookings
Auth: Bearer JWT
Request body:
{
  deskId: number,
  date: "YYYY-MM-DD"
}
Response 201:
{
  id: string,
  userId: string,
  deskId: number,
  date: "YYYY-MM-DD",
  status: "ACTIVE",
  createdAt: number, // epoch ms
  updatedAt: number
}
Errori:
- 400 INVALID_BODY / DATE_INVALID
- 404 DESK_NOT_FOUND
- 409 DESK_INACTIVE
- 409 USER_ALREADY_BOOKED
- 409 DESK_ALREADY_BOOKED
- 422 NON_WORKING_DAY

3.3 DELETE /bookings/:id
Auth: Bearer JWT
Request body (opzionale):
{ reason?: string }
Response 200:
{
  id: string,
  userId: string,
  deskId: number,
  date: "YYYY-MM-DD",
  status: "CANCELLED",
  cancelReason?: string,
  createdAt: number,
  updatedAt: number
}
Errori:
- 400 MISSING_ID / INVALID_BODY
- 403 FORBIDDEN (se non proprietario)
- 404 NOT_FOUND
- 409 CANCELLATION_WINDOW_PASSED

4) Implementazione MVP (in-memory)
- backend/src/modules/desks/desk.repository.ts: repository in-memory con 6 postazioni e stato active.
- backend/src/modules/bookings/booking.repository.ts: repository in-memory per prenotazioni (status, cancelReason, timestamps).
- backend/src/utils/date.ts: utilità per data-only, feriali, canonicalizzazione.
- backend/src/modules/bookings/bookings.service.ts: regole di business e orchestrazione.
- backend/src/modules/bookings/bookings.controller.ts: validazione zod e mapping errori → HTTP.
- backend/src/modules/bookings/bookings.router.ts: endpoint REST (GET map, POST create, DELETE cancel).

5) Estensioni future
- Persistenza con Prisma/PostgreSQL usando lo schema proposto.
- Tabella Holiday per festività nazionali/locali.
- Rate limiting per creazione massiva e audit trail.
- Ruoli: admin può vedere identità occupanti nella mappa o forzare cancellazioni.
