# QA Checklist — Pagina "Le Mie Prenotazioni" (Paginazione e Filtro Stato)

Versione: 1.0
Data: 17/01/2026
Autore: QA/Frontend Team
Stato: Operativo

Obiettivo
- Validare funzionalmente e visivamente la paginazione e il filtro stato nella pagina "Le Mie Prenotazioni".
- Coprire scenari chiave: cambio filtro (Attive/Passate/Cancellate), navigazione tra pagine, cambio pageSize, liste vuote, ritorno alla pagina 1 al cambio filtro.
- Verifica cross‑browser (Chrome, Edge, Firefox) e responsive (desktop, tablet/mobile).

Prerequisiti
- Utente autenticato nella PWA (può essere l'utente mock già previsto in AppRouter.tsx → LoginPage demo).
- Backend dev server avviato (endpoint stub /api/bookings/me disponibile via backend). In alternativa, il servizio frontend usa lo stub integrato.
- Data selezionata non influenza i test, ma il contesto è visibile per i lettori di schermo.

Selettori stabili per test (data-testid)
- Barra filtri stato: [data-testid="status-filter"]
  - Pulsanti: [data-testid="filter-ALL"], [data-testid="filter-ATTIVA"], [data-testid="filter-PASSATA"], [data-testid="filter-CANCELLATA"]
- Select righe per pagina: [data-testid="page-size-select"]
- Sezione Prossime:
  - Tabella: [data-testid="future-table"]
  - Vuoto: [data-testid="empty-future"]
  - Errore: [data-testid="error-future"]
  - Paginatore: wrapper [data-testid="paginator-future"], bottoni [data-testid="paginator-future-prev"], [data-testid="paginator-future-next"]
  - Progressive load: [data-testid="future-load-more"] (se presente)
- Sezione Passate:
  - Toggle mostra/nascondi: [data-testid="toggle-past"] (solo quando status = ALL)
  - Tabella: [data-testid="past-table"]
  - Vuoto: [data-testid="empty-past"]
  - Errore: [data-testid="error-past"]
  - Paginatore: wrapper [data-testid="paginator-past"], bottoni [data-testid="paginator-past-prev"], [data-testid="paginator-past-next"]
- Azioni riga:
  - Pulsante cancella (solo se consentito): [data-testid="cancel-<bookingId>"]

Check-list funzionale
1) Caricamento iniziale (status = ALL)
   - Verificare presenza barra filtri e select pageSize.
   - Verificare visibilità sezione "Prossime" con tabella e intestazioni.
   - Se presente "Passate" in modalità ALL, il pulsante Mostra/Nascondi deve alternare la visibilità.

2) Cambio filtro stato
   - ATTIVA: clic su [data-testid="filter-ATTIVA"] → sezione "Prossime" visibile; sezione "Passate" visibile con paginatore; pagina corrente deve tornare a 1.
   - PASSATA: clic su [data-testid="filter-PASSATA"] → solo sezione "Passate"; pagina = 1.
   - CANCELLATA: clic su [data-testid="filter-CANCELLATA"] → entrambe le sezioni possibili (in genere future/past secondo dataset); pagina = 1.
   - ALL: clic su [data-testid="filter-ALL"] → ripristino comportamento iniziale; sezione Passate toggle con [data-testid="toggle-past"].

3) Paginazione
   - Con più di N elementi, [data-testid="paginator-future-next"] abilitato: clic → pagina aumenta di 1 e la lista cambia senza duplicati e senza salti.
   - Clic su [data-testid="paginator-future-prev"] riporta alla pagina precedente.
   - Stesse verifiche per sezione Passate con [data-testid="paginator-past-*"].

4) Cambio pageSize
   - Selezionare 10/20/50 da [data-testid="page-size-select"].
   - Verificare che il numero di righe visualizzate corrisponda al valore selezionato (salvo ultima pagina con remainder).
   - Verificare il reset alla pagina 1 al cambio pageSize (controllando la label "Pagina X").

5) Liste vuote e nessun risultato
   - Forzare un range/utente con nessun risultato (opzionale via backend stub o API). In alternativa, usare filtro improbabile combinato a intervalli data.
   - Verificare messaggi [data-testid="empty-future"] e/o [data-testid="empty-past"].

6) Coerenza metadati
   - Confrontare il numero di righe in tabella con il conteggio atteso dal backend (totalItems/totalPages quando disponibile; in stub è simulato). In assenza, verificare che limit/pageSize sia rispettato e che hasNext/hasPrev abiliti/disabiliti correttamente i bottoni.

7) Cancellazione prenotazione (smoke)
   - Per una prenotazione cancellabile (>24h), clic [data-testid="cancel-<id>"] → confermare nel modal → la riga deve sparire e il conteggio righe ridursi di 1.
   - Per una prenotazione non cancellabile (<24h), il bottone non deve essere visibile; se forzato, il modal mostrerà un errore coerente.

Check-list cross‑browser e responsive
- Browser: Chrome (ultimo), Edge (ultimo), Firefox (ultimo). Se possibile Safari su macOS.
- Viewport: 1024×768 (desktop), 768×1024 (tablet), 390×844 (mobile). Verificare overflow orizzontale controllato (il contenitore ha overflowX: auto) e raggiungibilità dei controlli.
- Focus management: dopo click paginatore, il focus rimane sul bottone senza scorrimenti inattesi. Il modal di cancellazione cattura il focus e ESC chiude.
- Contrasto: testi e badge leggibili su sfondo.

Bug tracking
- Creare ticket per ogni incongruenza UI/UX riscontrata con:
  - Titolo: [MyBookings] Descrizione sintetica
  - Ambiente/Navigatore/Viewport
  - Passi per riprodurre
  - Risultato attuale vs atteso
  - Screenshot/registrazione (se possibile)

Automazione E2E (piano)
- Framework suggerito: Playwright. Vedi documento "docs/e2e-my-bookings-playwright-plan.md" per setup e casi coperti.
