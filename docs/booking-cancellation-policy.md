# Policy Cancellazione Prenotazioni — Regola 24 Ore

Versione: 1.0
Data: 17/01/2026
Autore: Backend/Frontend Team
Stato: Draft

Obiettivo
- Definire con precisione la regola che consente all’utente di cancellare una prenotazione solo se mancano più di 24 ore all’orario di utilizzo (inizio prenotazione).

Contesto attuale
- Modello Booking: data (date-only), stato (PASSATA/ATTIVA/CANCELLATA), cancelledAt (timestamptz), createdAt/updatedAt.
- Aggiunte proposte: startAt (timestamptz), endAt (timestamptz opzionale) per rappresentare la finestra di utilizzo quando disponibile.
- Timezone di riferimento applicativo: Europe/Rome. I timestamptz sono archiviati in UTC con semantica locale applicata in fase di creazione.

Regola di business
- L’utente standard può cancellare una prenotazione se, e solo se, il tempo rimanente tra “adesso” e l’orario di inizio utilizzo (startAt) è strettamente maggiore di 24 ore.
- Se startAt non è presente (prenotazioni legacy a sola data), si assume come orario di inizio le 09:00 locali Europe/Rome del giorno prenotato.
- Confronto temporale:
  - now: istante corrente in UTC.
  - start: calcolato come startAt se presente; altrimenti data + 09:00 in Europe/Rome, convertito a UTC.
  - cancellazione consentita se (start - now) > 24h.

Edge cases
- Prenotazione già cancellata (cancelledAt valorizzato): non consentita ulteriore cancellazione.
- Cambio d’ora legale: il confronto usa istanti assoluti UTC, quindi robusto a DST.
- Prenotazioni con data odierna: quasi sempre non cancellabili (a meno che startAt sia oltre 24h, scenario non realistico per giornaliere).
- Prenotazioni passate: non cancellabili; stato coerente con BookingStatusService.

Modifiche modello dati
- Tabella bookings: aggiunta colonne
  - start_at timestamptz (nullable) — orario di inizio utilizzo; backfill legacy a 09:00 Europe/Rome.
  - end_at timestamptz (nullable) — orario di fine utilizzo (futuro, opzionale).
- Indice: idx_bookings_start_at su start_at.
- Campo cancelled_at già presente; nessun soft-delete aggiuntivo necessario. Stato CANCELLATA deriva da cancelled_at.

Impatto su altri moduli
- Reportistica: può filtrare su start_at per “prenotazioni future” e aggregazioni per fascia oraria.
- Fatturazione: usa stato CANCELLATA per esclusioni; le regole di penale (se introdotte) potranno confrontare now vs start_at.
- Notifiche: reminder e cutoff cancellazione possono essere schedulati in base a start_at (es. 24-48h prima).

Implementazione
- Backend: introdotto BookingCancellationPolicy (backend/src/modules/booking/domain/services/BookingCancellationPolicy.ts) con funzione canUserCancel({ date, startAt?, cancelledAt?, now?, tz? }).
- Prisma/DB: aggiornato schema e migrazione 202601170200_booking_start_times per colonne start_at/end_at con backfill 09:00.
- Frontend: MyBookingsPage potrà leggere il campo startAt (quando esposto dall’API) e abilitare il bottone “Cancella” solo se canCancel=true; in assenza del campo, usare la regola 09:00 locale in UI per coerenza.

Note operative
- Timezone applicativa: Europe/Rome. Tutte le valutazioni “oggi/domani” lato backend usano questa TZ.
- Formato date-only: YYYY-MM-DD. Gli istanti assoluti usano ISO 8601 (UTC) in API.
