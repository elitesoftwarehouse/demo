# Migrazioni prenotazioni: stato e soft delete

Questo documento descrive come applicare le migrazioni necessarie per supportare la cancellazione delle prenotazioni con tracciabilità (soft delete) e l'esposizione dello stato di prenotazione.

## Obiettivi
- Aggiungere colonna `state` alla tabella `bookings` con valori gestiti dall'applicazione: `PASSATA`, `ATTIVA`, `CANCELLATA`.
- Aggiungere colonne di audit per la cancellazione: `canceled_at TIMESTAMPTZ`, `canceled_by UUID`, `cancel_reason TEXT`.
- Aggiornare indici per escludere le prenotazioni cancellate dalle query operative più comuni (disponibilità, conteggi, elenco "Le mie prenotazioni").
- Backfill dei dati esistenti.
- Trigger per mantenere coerenza tra colonne di audit e `state`.

## File
- `booking.migrations.sql`: script DDL/DML idempotente.

## Rollout (test e produzione)
1. Effettuare un backup del database.
2. Eseguire lo script `booking.migrations.sql` sull'ambiente target (test/produzione):
   - psql -h <host> -U <user> -d <db> -f backend/src/modules/bookings/booking.migrations.sql
3. Verificare che:
   - Le colonne `state`, `canceled_at`, `canceled_by`, `cancel_reason` siano presenti.
   - Gli indici `idx_bookings_user_date_active`, `idx_bookings_desk_date_active`, `idx_bookings_user_date` esistano.
   - Le righe esistenti abbiano `state` valorizzato coerentemente.
4. Rilasciare la nuova versione dell'applicazione.

## Rollback
- Lo script non rimuove colonne o dati esistenti. In caso di necessità:
  - È possibile ignorare l'uso del campo `state` a livello applicativo.
  - Per rimuovere le colonne aggiunte, valutare un change set dedicato e un piano di rollback con downtime, poiché un DROP COLUMN è distruttivo.

## Impatti sul codice applicativo
- Repository adeguato per:
  - escludere prenotazioni con `state = 'CANCELLATA'` nelle funzioni di disponibilità e conteggio (`findBookingByDeskAndDate`, `countUserBookingsOnDate`).
  - supportare il flag `includeCanceled` negli elenchi (`listUserBookings`).
  - tracciare audit al momento della cancellazione (`cancelBookingForUserWithAudit`).
- I servizi che calcolano disponibilità o statistiche devono considerare solo prenotazioni non cancellate, utilizzando gli indici parziali forniti.

## Note
- I valori di `state` sono gestiti dall'applicazione; non viene imposto un vincolo CHECK per flessibilità futura.
- `canceled_by` è di tipo UUID per referenziare l'utente (FK opzionale da aggiungere in futuro se necessario).
