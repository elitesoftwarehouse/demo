Requisiti UI — Blocco selezione date (festività e domeniche)
Versione: 1.0 — 2026-01-17

Obiettivo
- Disabilitare nel datepicker i giorni in cui il coworking è chiuso.
- Guidare l’utente con messaggi chiari e coerenti con la validazione backend.

Ambito
- Tutti i flussi che includono la scelta della data di prenotazione (mappa postazioni, form prenotazione, ecc.).

Regole da riflettere in UI
- Domeniche: sempre non selezionabili.
- Festività nazionali fisse: 01/01, 06/01, 25/04, 01/05, 02/06, 15/08, 01/11, 08/12, 25/12, 26/12.
- Festività mobile: Pasquetta (lunedì successivo alla Pasqua).
- Festività locali/extra: ottenute da endpoint backend /calendar/closed?year=YYYY (da implementare) e disabilitate nel datepicker.

Range temporale
- Anno corrente + prossimo. Il datepicker può caricare le date disabilitate all’apertura/scroll del mese.

Messaggi e accessibilità
- Tooltip/label per giorno disabilitato: “Chiuso per festività”.
- Al tentativo di selezione di un giorno disabilitato: toast o hint non bloccante.
- Localizzazione: IT (testi brevi, coerenti tra componenti).

Note implementative
- La decisione definitiva appartiene al backend. In UI fornire una funzione di utilità isClosed(date, closedList) per feedback immediato.
- Gestire la UX durante il caricamento delle closedList per l’anno richiesto (placeholder/ skeleton, retry).