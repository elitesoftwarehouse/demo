# Migrazione: Audit Cancellazione Prenotazioni e Soft Delete

Versione: 202601170300
Ambito: DB PostgreSQL (tabella bookings) + Prisma + dominio TS

Obiettivi
- Tracciare l'origine della cancellazione (utente, admin, sistema) con campi audit dedicati
- Raffinare lo stato di cancellazione con stati specifici: CANCELLATA_DA_UTENTE, CANCELLATA_DA_ADMIN
- Consentire la ri-prenotazione della stessa postazione/data quando la precedente prenotazione è cancellata (soft-delete logica)
- Mantenere compatibilità con codice esistente e assicurare indici utili per reportistica

Contenuti
1) Enum DB "CancellationSource" con valori USER, ADMIN, SYSTEM
2) Estensione enum "BookingState" con CANCELLATA_DA_UTENTE, CANCELLATA_DA_ADMIN (senza rimozione di valori esistenti)
3) Colonne audit: cancelled_by_user_id (FK users), cancellation_source, cancellation_reason (varchar)
4) Sostituzione indice univoco legacy uq_bookings_desk_date con indice univoco parziale uq_bookings_desk_date_active che esclude cancellate
5) Indici di supporto: idx_bookings_cancelled_at, idx_bookings_cancellation_source, idx_bookings_user_cancelled

File
- SQL: backend/prisma/migrations/202601170300_booking_cancellation_audit/migration.sql
- Prisma schema: backend/prisma/schema.prisma (enum CancellationSource, mapping nuovi campi su model Booking)
- Dominio TS: backend/src/modules/booking/domain/entities/Booking.ts (nuovi stati + campi audit)
- Servizio stato: backend/src/modules/booking/domain/services/BookingStatusService.ts (mapping stati cancellati per source)

Note su Unicità e Disponibilità
- Precedente vincolo UNIQUE(desk_id, date) impediva qualunque nuova riga anche se la prenotazione era cancellata
- Nuovo indice parziale:
  CREATE UNIQUE INDEX uq_bookings_desk_date_active ON bookings(desk_id, date)
  WHERE stato <> 'CANCELLATA' AND stato <> 'CANCELLATA_DA_UTENTE' AND stato <> 'CANCELLATA_DA_ADMIN'
  consente nuove prenotazioni se le precedenti sono cancellate.

Compatibilità/Impatto
- API/Report che non devono mostrare cancellate: filtrare stato NOT IN ('CANCELLATA','CANCELLATA_DA_UTENTE','CANCELLATA_DA_ADMIN')
- UI Badge: CANCELLATA_DA_* viene trattata come "Cancellata"; eventuale etichetta più specifica può essere aggiunta
- Nessuna rimozione di colonne; migrazione additive e sicura

Rollback (manuale)
- DROP INDEX IF EXISTS uq_bookings_desk_date_active;
- CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_desk_date ON bookings(desk_id, date);
- Gli stati aggiuntivi possono restare (backward compat); opzionale backfill a CANCELLATA

Operatività
- Eseguire migrazione in finestra a basso traffico. Se necessario usare CREATE INDEX CONCURRENTLY in uno script ad hoc
- Validare con query di verifica:
  SELECT stato, COUNT(*) FROM bookings GROUP BY 1;
  SELECT COUNT(*) FROM bookings b1 JOIN bookings b2 USING (desk_id, date) WHERE b1.id <> b2.id AND b1.stato NOT IN ('CANCELLATA','CANCELLATA_DA_UTENTE','CANCELLATA_DA_ADMIN') AND b2.stato NOT IN ('CANCELLATA','CANCELLATA_DA_UTENTE','CANCELLATA_DA_ADMIN');
