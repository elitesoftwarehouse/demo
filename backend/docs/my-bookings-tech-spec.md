Spec tecnico — Pagina "Le Mie Prenotazioni" (backend+API)
Versione: 0.9 (proposta da validare con PO) — 2026-01-17

Obiettivo
- Esporre un elenco delle prenotazioni dell’utente autenticato, ordinate cronologicamente con le più prossime in alto.
- Definire modello dati minimale lato backend, API e regole di ordinamento/paginazione.

Dominio/Modello dati Prenotazione (proposta)
- Booking (prenotazione)
  - id: uuid
  - userId: uuid (FK → users.id)
  - stationId: text (o uuid se esiste tabella stations) — es. "S07"
  - date: date (data locale del giorno di prenotazione)
  - timeSlot: text|null (opz., es. "AM", "PM", "09-13"). Se non usato, prenotazione per l’intera giornata.
  - status: enum('PENDING','CONFIRMED','CANCELLED','COMPLETED')
  - createdAt: timestamptz
  - updatedAt: timestamptz
  - note: text|null (opz.)
- Nota tempo/fuso: per le prenotazioni giornaliere si usa il tipo DATE per la colonna "date" (timezone-agnostic). Per slot orari, eventuali startAt/endAt timestamptz possono essere aggiunti in futuro (UTC in DB, conversione in UI Europe/Rome).

API (proposta)
- GET /bookings/my
  - Auth richiesta (JWT) — usare JWTAuthMiddleware già presente.
  - Query params (tutti opzionali):
    - from: YYYY-MM-DD (inclusivo)
    - to: YYYY-MM-DD (inclusivo)
    - status: string | string[] (filtri multipli)
    - page: number (default 1)
    - pageSize: number (default 20, max 100)
    - sort: 'chronological' | 'desc' (default 'chronological')
      - chronological: futuro → passato (dettaglio sotto in Ordinamento)
  - Response 200:
    - { items: BookingDto[], page, pageSize, total, hasMore }
  - BookingDto (safe, UI-ready):
    - id, date (ISO YYYY-MM-DD), stationId, status, timeSlot?, createdAt, updatedAt
    - Campi opzionali: stationName, building, floor se disponibili in futuro.

Ordinamento (requisito UX)
- Logica default 'chronological' (più prossime in alto):
  1) Prenotazioni future: ordinate asc per date, poi per timeSlot (se presente), poi id asc.
  2) A seguire, prenotazioni passate: ordinate desc per date, poi per timeSlot desc, poi id desc.
- Implementazione SQL suggerita (singola query):
  - ORDER BY (date < current_date) ASC,  -- false(0)=future prima, true(1)=past dopo
            date ASC NULLS LAST,
            timeSlot ASC NULLS LAST,
            id ASC
  - Per la sezione "passata" si può invertire con un CASE o fare due query + UNION ALL con limiti separati. In prima iterazione è accettabile la singola ORDER BY come sopra; per grandi dataset valutare partizionamento su futuro/passat o.

Paginazione
- Cursor o pagina/size. In prima iterazione usare page/pageSize.
- Defaul t: page=1, pageSize=20, max=100.
- hasMore calcolato in base a total o via lookahead di (pageSize+1).

Filtri
- from/to applicati sulla colonna date (DATE): WHERE date BETWEEN from AND to.
- status IN (...), ignorare se non presente.

Sicurezza e permessi
- Endpoint protetto da JWT; userId estratto da token (claim sub) e usato nel WHERE user_id = $currentUser.
- Nessun accesso ad altri utenti.

Impatti su DB (proposta di schema e indici)
- Tabella bookings (nuova):
  - id uuid PK default gen_random_uuid()
  - user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - station_id text NOT NULL
  - date date NOT NULL
  - time_slot text NULL
  - status booking_status NOT NULL DEFAULT 'CONFIRMED'
  - created_at timestamptz NOT NULL DEFAULT now()
  - updated_at timestamptz NOT NULL DEFAULT now()
- Enum booking_status: ('PENDING','CONFIRMED','CANCELLED','COMPLETED')
- Vincoli per prevenire doppie prenotazioni della stessa postazione:
  - UNIQUE (station_id, date, COALESCE(time_slot, 'ALL')) WHERE status IN ('PENDING','CONFIRMED')
- Indici per la pagina "Le Mie Prenotazioni":
  - IDX bookings_user_date: CREATE INDEX ON bookings (user_id, date);
  - Facoltativi:
    - CREATE INDEX ON bookings (user_id, status, date);
    - CREATE INDEX ON bookings (user_id, date DESC) per ottimizzare mix futuro/passato.

Conversione date e formati (UI)
- DB: DATE per prenotazioni giornaliere (nessun fuso). UI: mostrare in locale dell’utente, formato IT dd/MM/yyyy.
- Se/quando si usano slot orari con timestamptz, salvare in UTC e convertire in UI (Europe/Rome). La proprietà date nel DTO resta YYYY-MM-DD per l’ordinamento principale.

Servizi backend previsti
- BookingRepository.findByUser(userId, filters): Promise<{ items, total }>
  - Filtri: from, to, status[], page, pageSize, sort.
- BookingMapper → BookingDto.
- Route handler GET /bookings/my che orchestra repository + response.

Errori e codici
- 401 se non autenticato; 400 per parametri invalidi; 500 per errori interni.

Punti aperti da validare con PO
- Stati effettivi da gestire (es. 'NO_SHOW', 'REJECTED'?).
- Slot orari: presente fin da ora o solo giornata intera? (implica timeSlot e vincoli).
- Esposizione di campi aggiuntivi (stationName/building/floor).
- Politica paginazione (page/size vs cursor) e limiti di retention/storico.

Note implementative
- Esistono già: POST /bookings (assunto dal frontend attuale). Questo spec integra il listing GET /bookings/my coerente.
- Endpoint protetto da middleware JWT già implementato nel core/security.
