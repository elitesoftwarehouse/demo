End-to-end (E2E) tests per vista Riepilogo ore Amministratore

Contenuto
- Cartella e2e/ con configurazione Playwright, script npm e test principali.
- I test sono progettati per essere resilienti: usano data-testid consigliati nel piano di test. Se la UI non li espone ancora, aggiornare i selettori nei test di conseguenza.

Prerequisiti
- Node.js >= 18
- Applicazione in esecuzione (BASE_URL predefinita: http://localhost:8080)

Setup rapido
1) cd e2e
2) npm ci
3) npx playwright install --with-deps
4) Esportare variabili opzionali:
   - BASE_URL, ADMIN_USER, ADMIN_PASS, NONADMIN_USER, NONADMIN_PASS
5) npm test

Note su selettori
- I test usano getByTestId con i seguenti identificatori suggeriti:
  admin-summary-page, date-from, date-to, collaborator-select, order-select, apply-filters, reset-filters, results-grid, result-row, total-collaborator-<id>, total-order-<id>, grand-total, empty-state, error-state, loading-state
- Se la UI usa componenti custom, assicurarsi che gli elementi siano navigabili e gli attributi data-testid presenti.

Ambito dei test inclusi
- Accesso come Admin e apertura pagina riepilogo.
- Accesso negato a utente non‑admin.
- Applicazione filtro per data con verifica della presenza di risultati o stato vuoto.
- Applicazione filtri combinati (Collaboratore + OL + date) con verifica presenza risultati.

Estensioni suggerite
- Aggiungere asserzioni su totali attesi se si dispone di un dataset deterministico.
- Coprire scenari di errore simulando 500/403 e validazioni (date invertite) se la UI espone stub o feature flag.
