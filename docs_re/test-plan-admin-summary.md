# Piano di test funzionali e end‑to‑end: Riepilogo ore (vista Amministratore)

Obiettivo: verificare che la vista di riepilogo ore, raggruppate per Collaboratore e Ordine di Lavoro, funzioni correttamente dall’interfaccia al backend per un dato intervallo di date.

Prerequisiti
- Ambiente disponibile (dev/test) con dati timesheet di riferimento noti.
- Utente Admin attivo (es. admin@example.com / ******) e utente non‑admin (per test di accesso).
- URL applicazione (es. http://localhost:8080 oppure ambiente di test dedicato).
- Definizione selettori o data-testid stabiliti in UI (vedi sezione E2E automatizzati).

Ambito
- Filtri: data (obbligatoria), Collaboratore, Ordine di Lavoro (combinabili).
- Risultati: righe raggruppate per Collaboratore e per Ordine di Lavoro, totali parziali e totale generale.
- Navigazione/permessi: accesso consentito solo ad Admin; corretta gestione di login/redirect.
- UX: stati di loading, messaggi di errore, nessun risultato, responsività e resa su browser target.

1) Test manuali guidati

1.1 Accesso e permessi
- [ ] Logout da sessioni precedenti. Accedi come utente non‑admin.
  - Atteso: accesso negato alla pagina riepilogo (redirect a login o pagina 403/401), nessun dato mostrato.
- [ ] Accedi come Admin.
  - Atteso: accesso alla pagina riepilogo ore via menù/link visibile solo ad Admin.

1.2 Filtri base (solo data)
- [ ] Apri la pagina riepilogo.
- [ ] Imposta solo l’intervallo date (Da/A) con un periodo che contiene dati noti.
- [ ] Applica i filtri.
  - Atteso: compaiono righe raggruppate con ore totali coerenti ai dati timesheet di riferimento; nessun filtro Collaboratore/OL selezionato.

1.3 Filtri combinati (Collaboratore + Ordine di Lavoro + data)
- [ ] Seleziona un Collaboratore specifico e un Ordine di Lavoro, mantenendo lo stesso intervallo date.
- [ ] Applica i filtri.
  - Atteso: compaiono solo i gruppi/righe compatibili; i totali corrispondono alla somma delle ore del collaboratore sull’OL nell’intervallo.

1.4 Verifica dei totali
- [ ] Verifica Totale per Collaboratore (somma delle sue righe/OL).
- [ ] Verifica Totale per Ordine di Lavoro (somma delle righe di tutti i collaboratori).
- [ ] Verifica Totale generale (somma di tutti i totali parziali).
  - Atteso: i valori corrispondono ai dati timesheet noti; nessuna discrepanza di arrotondamento.

1.5 stati UI e messaggistica
- [ ] Loading: durante l’applicazione filtri compare uno stato di caricamento e sparisce al termine.
- [ ] Errori: simula errore backend (se possibile) o disconnessione.
  - Atteso: messaggio di errore user‑friendly, possibilità di riprovare.
- [ ] Nessun risultato: seleziona un intervallo senza dati.
  - Atteso: messaggio “Nessun risultato” chiaro, 0 righe, totali = 0.

1.6 Navigazione e link
- [ ] Menù: il link alla pagina è presente solo per Admin; i breadcrumb sono corretti.
- [ ] Eventuali link di dettaglio (es. clic su riga per vedere dettaglio timesheet) funzionano e rispettano i filtri.

1.7 Responsività e resa grafica
- [ ] Desktop, tablet, mobile: verifica layout, overflow delle tabelle, wrapping dei testi, sticky header (se previsto).
- [ ] Browser target del portale (es. Chrome, Firefox, Edge, Safari): verifica resa e funzionalità base.

Dati di riferimento suggeriti
- Periodo: primo giorno del mese corrente → oggi.
- Collaboratori di test: Alice Rossi, Mario Verdi.
- Ordini di Lavoro: OL‑1001, OL‑2002.
- Esempio atteso (solo indicativo):
  - Alice, OL‑1001: 12h; Alice, OL‑2002: 8h; Totale Alice: 20h
  - Mario, OL‑1001: 6h;  Totale Mario: 6h
  - Totale OL‑1001: 18h; Totale OL‑2002: 8h; Totale generale: 26h

2) Test end‑to‑end automatizzati (Playwright)

Se la toolchain lo consente, è incluso uno scheletro Playwright in cartella e2e/ con casi principali:
- Accesso come Admin e apertura pagina riepilogo.
- Applicazione filtro data e verifica comparsa dati raggruppati.
- Verifica accesso negato a utente non‑admin.

Prerequisiti E2E
- Node.js >= 18 installato.
- Applicazione in esecuzione localmente o URL di test disponibile.
- UI dotata di attributi data-testid coerenti con quelli usati nei test (vedi elenco sotto) oppure aggiornare i selettori nel test.

Esecuzione
1. cd e2e
2. npm ci
3. npx playwright install --with-deps
4. Impostare variabili (opzionali): BASE_URL, ADMIN_USER, ADMIN_PASS, NONADMIN_USER, NONADMIN_PASS
5. npm test

Selettori consigliati (data-testid)
- admin-summary-page
- date-from, date-to
- collaborator-select, order-select
- apply-filters, reset-filters
- results-grid
- result-row (per singola riga)
- total-collaborator-<id>, total-order-<id>, grand-total
- empty-state, error-state, loading-state

3) Verifica API/integrazione backend
- Controllare le richieste emesse dalla UI (metodo, path, payload/query). Esempio: GET /api/admin/hours-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&collaboratorId=&orderId=
- Validare: status 200, payload con gruppi per Collaboratore e Ordine di Lavoro, totali corretti.
- Gestione errori: 401/403 per non‑admin; 4xx per validazioni; 5xx con messaggi gestiti lato UI.

4) Casi limite
- Intervallo date con from>to (atteso: validazione client o 400).
- Collaboratore/OL inesistenti (atteso: nessun risultato o 400 se parametri non validi).
- Elevato volume di dati (atteso: paginazione o performance accettabile e UI reattiva).

5) Criteri di accettazione
- Accesso consentito solo ad Admin; non‑admin non visualizzano dati.
- Filtri funzionanti singolarmente e in combinazione.
- Totali calcolati correttamente e coerenti con i dati timesheet.
- UX curata: loading, errori, empty state, responsività e resa su browser target.
- E2E base eseguibili con esito positivo nell’ambiente di test.
