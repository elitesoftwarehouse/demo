# Cancellazione Prenotazioni - Nota Tecnica

Versione: 1.0  
Data: 18/01/2026

## Regola di Business
- Un utente standard può cancellare una propria prenotazione solo se mancano più di 24 ore all'orario di utilizzo (inizio prenotazione).
- Confronto rigoroso: NOW + 24h <= startAt. In altri termini, è consentito se le ore rimanenti sono strettamente maggiori di 24.

## Timezone di Riferimento
- La piattaforma opera lato backend in UTC per garantire comportamenti deterministici e consistenti.
- La UI può mostrare i valori nella timezone locale dell'utente, ma le decisioni di dominio (come la cancellazione) sono calcolate in UTC.

## Modello Dati Attuale
- `booking.model.ts` definisce:
  - `date: Date` (solo data, normalizzata a mezzanotte UTC)
  - `status: 'confirmed' | 'pending'` (legacy)
  - `state?: 'PASSATA' | 'ATTIVA' | 'CANCELLATA'` (nuovo, opzionale)
  - `createdAt`, `updatedAt`
- `booking.repository.ts` persiste `date` come `DATE` (YYYY-MM-DD) e opzionalmente `state`.
- `listUserBookings` restituisce `startDate` (stringa YYYY-MM-DD) e `state`.

## Campo Orario di Utilizzo (startAt)
- Attualmente non esiste un campo orario esplicito nel DB; la prenotazione è "a giornata".
- Per supportare la regola di 24 ore è necessario definire un orario di inizio di riferimento. Scelte:
  1. Impostare un orario di default (es. 09:00 UTC) per tutte le prenotazioni a giornata.
  2. Estendere il modello per includere `start_at TIMESTAMPTZ` e (facoltativo) `end_at TIMESTAMPTZ`.

### Decisione
- Nell'immediato, adottiamo l'opzione 1 con parametri configurabili (default 09:00 UTC) per compatibilità retroattiva.
- A tendere, raccomandiamo di introdurre `start_at` in DB per tracciamento preciso e possibili fasce orarie.

## Servizio di Dominio
- Aggiunto `booking.cancellation.service.ts` che espone:
  - `computeStartAtUTC(dateOnly, cfg?)` per derivare `startAt` a partire da `date`.
  - `canCancelBooking(booking, { now?, policy? })` che ritorna `{ allowed, reason?, hoursBeforeStart, startAt, now }`.
- Policy di default: cutoff 24 ore; start 09:00 UTC.

## Modifiche Dati Proposte
- Per audit e coerenza dello stato:
  - Aggiungere colonne opzionali:
    - `state TEXT` (se non presente): valori gestiti dall'app ('PASSATA', 'ATTIVA', 'CANCELLATA').
    - `canceled_at TIMESTAMPTZ NULL` per soft-delete e tracciabilità cancellazione.
    - `canceled_by TEXT NULL` (user id) e `cancel_reason TEXT NULL` opzionali.
- Impatti:
  - Reportistica: includere cancellazioni con `canceled_at` e stato `CANCELLATA` per storicizzare intenti e KPI.
  - Fatturazione: escludere prenotazioni con `canceled_at` non null se policy commerciale lo richiede.
  - Notifiche: trigger su cancellazione per inviare email/Push all'utente e agli admin.

## Logica di confronto 24 ore
- Calcolo ore rimanenti: `(startAt - now) / 3600000`.
- Consentito solo se `ore_rimanenti > 24`. Non consentito per `== 24` (edge case definito).
- Edge cases gestiti:
  - Prenotazioni già nel passato: non annullabili (ore_rimanenti <= 0).
  - `state = 'CANCELLATA'`: già annullata; idempotenza lato API dovrebbe ritornare 409 o 200 idempotente.
  - Disallineamenti orari: l'uso di UTC evita ambiguità DST.

## Aggiornamenti API/Repository
- `cancelBookingForUser(...)` ora limita al solo `date >= today` (giorno), ma non applica la regola delle 24 ore. Suggerimento:
  - Integrare `canCancelBooking(...)` a livello di service/controller per verificare la policy prima dell'UPDATE.
  - Estendere la tabella per `canceled_at` e aggiornare la query di update per impostare `state = 'CANCELLATA'`, `canceled_at = NOW()`.

## UI (Le Mie Prenotazioni)
- Mostrare azione "Annulla" solo se `state !== 'CANCELLATA'` e `canCancel` valutata lato client o fornita dal backend.
- Idealmente il backend arricchisce il DTO con `canCancel: boolean` e `cancelCutoffAt: ISO`.

## Prossimi Passi
- Definire migrazione DB per `state`, `canceled_at`, `canceled_by`, `cancel_reason` se mancanti.
- Esporre endpoint DELETE/POST `/bookings/:id/cancel` che valida la policy con `canCancelBooking`.
- Adeguare test di integrazione per il nuovo comportamento.
