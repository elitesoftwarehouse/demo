Database SmartDesk - Schema tavoli e prenotazioni

Obiettivo: definire lo schema relazionale per supportare le regole di business delle prenotazioni.

Tabelle
- desk (POSTAZIONE)
  - id INT PK AUTOINCREMENT
  - code TEXT UNIQUE
  - rowIndex INT
  - colIndex INT
  - label TEXT
  - active BOOLEAN DEFAULT true
  - createdAt TIMESTAMP DEFAULT now()
  - updatedAt TIMESTAMP ON UPDATE now()

- booking (PRENOTAZIONE_POSTAZIONE)
  - id UUID PK
  - userId UUID FK -> user.id
  - deskId INT FK -> desk.id
  - date DATE (solo data, senza orario)
  - status TEXT DEFAULT 'ACTIVE'
  - cancelledAt TIMESTAMP NULL
  - cancelledReason TEXT NULL
  - createdAt TIMESTAMP DEFAULT now()
  - updatedAt TIMESTAMP ON UPDATE now()

Vincoli/Indici
- UNIQUE (userId, date, status) per garantire una sola prenotazione ATTIVA per utente e data
- UNIQUE (deskId, date, status) per garantire una sola prenotazione ATTIVA per postazione e data
- INDEX (userId, date) per query utente/data
- INDEX (deskId, date) per query postazione/data

Regole business enforce
- Giorni feriali: gestiti a livello servizio verificando weekday e festività configurabili (env HOLIDAYS)
- Una sola prenotazione attiva per utente/data: garantita da unique constraint su (userId, date, status)
- Postazione libera per data: garantita da unique constraint su (deskId, date, status)
- Cancellazione consentita >24h: verificata a livello servizio calcolando differenza da inizio giornata

Concorrenza
- In produzione: eseguire create prenotazione in transazione e gestire errori di unique constraint come conflitti 409
- In questa implementazione in-memory: disponibile metodo createAtomic che effettua check-and-insert atomico in un unico tick.
