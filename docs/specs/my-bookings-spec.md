Title: Spec tecnico – Pagina "Le Mie Prenotazioni"

Contesto e modello dati esistente
- Modello Booking (da Prisma/schema + migrazioni SQL):
  - id (UUID)
  - userId (UUID, FK users.id)
  - deskId (UUID)
  - date (giorno della prenotazione)
  - timeSlot (string, opzionale – es. "MORNING", "AFTERNOON", "09:00-13:00" a seconda della convenzione)
  - status (enum: PENDING | CONFIRMED | CANCELLED)
  - createdAt, updatedAt
- Indici attuali (DB):
  - UNIQUE (desk_id, date, time_slot) WHERE status <> 'CANCELLED'
  - INDEX user_id
  - INDEX date
- Nota tecnica: nello schema SQL la colonna "date" è di tipo DATE (senza ora). In Prisma è mappata come DateTime (limite tecnico di Prisma). Interpretazione funzionale: la prenotazione è giornaliera, con timeSlot a precisare la porzione di giornata; il campo rappresenta una data senza fuso orario.

API – Endpoint proposto
- GET /api/bookings/me
  - Descrizione: restituisce l’elenco paginato delle prenotazioni dell’utente autenticato.
  - Autenticazione: JWT (ruolo USER o superiore). userId dedotto dal token (sub).
  - Query params (tutti opzionali):
    - from: YYYY-MM-DD (inclusivo)
    - to: YYYY-MM-DD (inclusivo)
    - status: PENDING|CONFIRMED|CANCELLED (multipli separati da virgola)
    - includePast: boolean (default true) – se false, mostra solo future/odierne
    - page: number (default 1)
    - pageSize: number (default 20, max 100)
    - sort: preset di ordinamento (vedi sotto). Default: "chronological".
  - Risposta 200 (application/json):
    {
      "items": [
        { "id", "date": "YYYY-MM-DD", "timeSlot", "status", "deskId" },
      ],
      "page": 1,
      "pageSize": 20,
      "total": 123
    }

Regole di ordinamento (chronological default)
- Obiettivo: "più prossime in alto". Si propone ordering ibrido:
  1) Prenotazioni future e odierne: ordine crescente per (date, timeSlot)
  2) Prenotazioni passate: in coda, ordine decrescente per (date, timeSlot)
- Implementazione SQL (indicativa, PostgreSQL):
  - is_past = (date < CURRENT_DATE)
  - ORDER BY is_past ASC, date ASC, time_slot ASC NULLS LAST
  - Se includePast=false: WHERE date >= CURRENT_DATE e ORDER BY date ASC, time_slot ASC
- Nota: se fosse necessario considerare l’ora corrente per l’odierno (per distinguere slot già passati), occorre standardizzare i valori di timeSlot (es. intervalli orari) e confrontare con l’orario locale desiderato. In assenza, trattiamo tutto il giorno corrente come “non passato”.

Filtri
- from/to: filtro su date tra [from, to].
- status: filtro su lista di stati; default: tutti tranne CANCELLED se esplicitato dal PO (da confermare). Proposta: includere per default tutti gli stati e lasciare alla UI l’applicazione filtri.
- deskId (eventuale estensione futura): potrebbe essere utile filtrare per postazione specifica.

Paginazione
- Standard page (>=1) + pageSize (default 20, max 100). Restituiamo anche total per consentire UI di paginare.
- Ordinamento deterministico con tie-breaker su id per consistenza: aggiungere id ASC/desc come ultimo criterio ove necessario.

Formati e fuso orario
- Storage: campo date in DB è DATE (senza orario). Si tratta come data “locale” del coworking. Nessuna conversione fuso su storage.
- API: esporre come stringa ISO calendario (YYYY-MM-DD). Nessun suffisso di fuso orario.
- UI: mostrare nel fuso locale dell’utente ma poiché è data-only, non serve conversione; per timeSlot, è una label/slot definito dal coworking (già locale).
- Se in futuro saranno gestite prenotazioni con timestamp pieno, si converte tutto in UTC su storage ed in ISO 8601 con offset in API.

Impatto su DB e performance
- Query tipica: WHERE user_id = :me [AND date >= from] [AND date <= to] [AND status IN (...)] ORDER BY (date < CURRENT_DATE) ASC, date ASC, time_slot ASC NULLS LAST LIMIT :limit OFFSET :offset
- Indice raccomandato (composito) per ottimizzare per utente+data:
  - CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, date);
  - Facoltativo: includere time_slot se usato spesso nell’order by: CREATE INDEX IF NOT EXISTS idx_bookings_user_date_slot ON bookings(user_id, date, time_slot);
- Gli indici esistenti su user_id e date separati sono utili ma il composito migliora l’access pattern più frequente.

Error handling
- 400 per parametri invalidi (date malformate, pageSize>max, status non valido)
- 401 se non autenticato

Backlog/To-Confirm con PO
- Conferma logica di ordering: futuro/oggi asc in alto, passato in coda desc.
- Default status filter: includere CANCELLED oppure escluderlo? (Proposta: includerlo ma permettere filtro in UI)
- Tassonomia timeSlot: valori possibili e ordine naturale (definire enum/ordinamento coerente se necessario)

Implementazione suggerita (prossimi passi)
- Backend: aggiungere controller GET /api/bookings/me nel modulo bookings (nuovo), service per query con Prisma, validazioni query params, e test.
- DB: aggiungere indice composito (migrazione).
- Frontend: pagina con lista paginata, gruppi “Prossime” e “Passate” opzionali; filtri data/stato, ordinamento default, formattazione date.
