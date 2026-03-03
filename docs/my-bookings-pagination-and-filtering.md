# API "Le Mie Prenotazioni" — Paginazione e Filtro per Stato

Versione: 1.0
Data: 17/01/2026
Autore: Backend/Frontend Team
Stato: Definitivo (contratto)

Obiettivo
- Definire i contratti API per l'elenco "Le Mie Prenotazioni" con supporto a paginazione e filtro per stato.
- Allineare naming dei parametri e formato risposta con il frontend per evitare refactor.
- Mantenere compatibilità con la proposta di keyset pagination (cursor) già presente nei draft precedenti.

1) Endpoint
- GET /api/bookings/me
  - Sicurezza: Authorization: Bearer <access_token>
  - Ritorna SOLO le prenotazioni dell'utente autenticato.

2) Parametri di query supportati
- Modalità Keyset (preferita per performance su dataset grandi — compat con draft esistente):
  - limit: int (1..100, default 20)
  - cursor: string opaco (token generato con ultima chiave di ordinamento es. base64(date:id))
  - order: asc|desc (default: asc)
  - from: YYYY-MM-DD (opzionale) — filtro data minima inclusiva
  - to: YYYY-MM-DD (opzionale) — filtro data massima inclusiva
  - status: enum/string (ATTIVA|PASSATA|CANCELLATA|ALL|NONE) opzionale
    - Se assente o =ALL: non applica filtro stato (si applicano solo from/to)
    - NONE è riservato/compat UI e non applica filtro

- Modalità Page/Offset (richiesta da PO; utile per UI numerate e report):
  - page: int (>=1; default 1)
  - pageSize: int (1..100; default 20; max 100)
  - sort: opzionale; default "date"; direzione definita da "order" (asc|desc)
  - Gli altri parametri (from, to, status, order) restano identici.

- Regole di precedenza:
  - Se presenti limit e/o cursor → si usa la modalità Keyset.
  - Altrimenti, se presenti page/pageSize → modalità Page/Offset.
  - In assenza di entrambi → default keyset con limit=20.

3) Formato risposta
- Modalità Keyset:
  {
    items: BookingItem[],
    nextCursor?: string | null,
    // Convenienze opzionali per UI
    hasNext?: boolean
  }

- Modalità Page/Offset:
  {
    items: BookingItem[],
    page: number,         // 1-based
    pageSize: number,
    totalItems: number,   // può essere costoso; valutare flag withTotal=true in ambienti ad alto carico
    totalPages: number,
    hasNext: boolean,
    hasPrevious: boolean
  }

- Modello BookingItem (estratto):
  {
    id: string,
    deskId: string,
    deskName?: string,
    date: string,          // YYYY-MM-DD (date-only)
    status: string,        // vedi mapping sotto
    startTime?: string,    // HH:mm opzionale
    endTime?: string,      // HH:mm opzionale
    locationName?: string,
    createdAt?: string,    // ISO
    updatedAt?: string     // ISO
  }

4) Filtro stato — mapping applicativo ↔ DB
- Stati lato UI/applicazione per l'elenco: ATTIVA, PASSATA, CANCELLATA
- Persistenza DB (enum "BookingState" già presente): PASSATA, ATTIVA, CANCELLATA, CANCELLATA_DA_UTENTE, CANCELLATA_DA_ADMIN
- Regole di mapping per filtro:
  - status=ATTIVA → DB: stato = 'ATTIVA' AND data >= oggi (Europe/Rome) [oppure usare servizio dominio]
  - status=PASSATA → DB: stato = 'PASSATA' OR (stato='ATTIVA' AND data < oggi) [compat con record legacy]
  - status=CANCELLATA → DB: stato IN ('CANCELLATA','CANCELLATA_DA_UTENTE','CANCELLATA_DA_ADMIN')
  - status=ALL/NONE/assente → nessun filtro di stato; si applicano eventuali from/to

Nota: per coerenza con logica business, è raccomandato usare BookingStatusService.computeStatus lato applicazione/dominio per derivare lo stato finale esposto, specie in presenza di startAt/endAt.

5) Ordinamento
- Ordinamento primario: date (asc/desc), con tie-break su id (asc/desc coerente).
- Keyset cursor deve codificare la coppia (date,id) per garantire stabilità e scorrimento corretto.

6) Validazioni e limiti
- page >= 1; pageSize in [1,100]
- limit in [1,100]
- from/to formato YYYY-MM-DD; from <= to
- status solo tra i valori previsti (case-insensitive accettata lato API, normalizzata).

7) Sicurezza e autorizzazioni
- Endpoint protetto; restituisce solo le prenotazioni dell'utente autenticato.
- Nessun dato sensibile incluso.

8) Backward compatibility
- Il servizio attuale lato frontend supporta già limit/cursor; aggiungiamo opzionalmente status come query param.
- I client che desiderano pagine numerate possono passare page/pageSize; la risposta includerà totalItems/totalPages.

9) Esempi
- Keyset future (default):
  GET /api/bookings/me?from=2026-01-17&order=asc&limit=20
  → { items: [...], nextCursor: "MjA=" }

- Keyset con filtro stato cancellate:
  GET /api/bookings/me?status=CANCELLATA&limit=50&order=desc

- Page/Offset, past, page 2:
  GET /api/bookings/me?page=2&pageSize=20&to=2026-01-16&order=desc
  → { items: [...], page: 2, pageSize: 20, totalItems: 87, totalPages: 5, hasNext: true, hasPrevious: true }

10) Frontend alignment
- Il client frontend espone fetchMyBookings(options) con:
  - limit/cursor (keyset) e status opzionale; scope 'future'|'past' mappa su from/to+order.
  - Eventuale estensione futura: supporto page/pageSize in un nuovo metodo o opzioni di compatibilità.

Riferimenti
- docs/my-bookings-data-and-api-spec.md (bozza storica)
- docs/booking-status-badges-ui-spec.md (etichette UI per stati)
