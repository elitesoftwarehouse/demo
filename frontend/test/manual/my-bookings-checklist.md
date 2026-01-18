# Check-list test UI: Le Mie Prenotazioni — Paginazione e Filtro Stato

Obiettivo: validare funzionalmente e visivamente la paginazione e il filtro stato (Attive, Passate, Cancellate) nella vista "Le Mie Prenotazioni", con coerenza tra UI e dati.

Prerequisiti
- Utente autenticato con un set di prenotazioni che copra i tre stati (Attiva, Passata, Cancellata)
- Dataset con quantità sufficiente per generare più pagine (es. > pageSize)
- Conoscenza metadati restituiti dall’API: totalItems, totalPages, page, pageSize, stateFilter

Scenari funzionali
1) Cambio stato (tab/segment control)
   - Seleziona "Attive":
     - La lista mostra solo prenotazioni con stato Attiva
     - Il numero di elementi in tabella corrisponde a min(pageSize, totalItems per Attive)
     - La paginazione si resetta alla prima pagina
   - Seleziona "Passate":
     - Mostra solo prenotazioni Passate
     - Reset alla pagina 1
   - Seleziona "Cancellate":
     - Mostra solo prenotazioni Cancellate
     - Reset alla pagina 1

2) Navigazione tra pagine
   - Con più pagine disponibili:
     - Clic su Avanti porta da pagina N a N+1 finché N < totalPages
     - Clic su Indietro porta da pagina N a N-1 finché N > 1
     - Bottoni/controlli non permettono di superare i limiti (disabilitati ai bordi)
     - La UI evidenzia la pagina corrente coerente con i metadati

3) Cambio pageSize (se presente)
   - Cambiando pageSize:
     - La lista si aggiorna con il nuovo numero di elementi per pagina
     - La paginazione si resetta alla prima pagina
     - totalPages si aggiorna coerentemente (⌈totalItems/pageSize⌉)

4) Gestione liste vuote
   - Per uno stato senza risultati:
     - Mostrare messaggio/placeholder "Nessuna prenotazione"
     - Controlli di paginazione disabilitati o nascosti correttamente
     - Metadati coerenti: totalItems=0, totalPages=0 o 1 (secondo definizione UI)

5) Coerenza UI ↔ Dati
   - Il conteggio righe in tabella non supera pageSize
   - Somma elementi per tutte le pagine dello stato selezionato == totalItems per quello stato
   - La pagina corrente e totalPages riflettono i metadati della risposta API

6) Stato e URL (se deep-linking)
   - Verificare che i parametri (es. ?state=ATTIVA&page=2&pageSize=10) aggiornino correttamente la UI
   - Navigando indietro/avanti nel browser, la UI resta coerente con l’URL

Cross-browser e Responsiveness
- Browser: Chrome, Edge, Firefox (ultime versioni)
- Risoluzioni: Desktop (≥1280px), Tablet (768–1024px)
- Verifiche:
  - I controlli di filtro e paginazione sono visibili, cliccabili e non fuori schermo
  - Focus state accessibili (tastiera: Tab/Enter/Space) e ARIA label per i bottoni di paginazione
  - Nessuna sovrapposizione o wrap errato dei controlli su tablet

Dati di prova suggeriti
- Stato Attive: almeno 13 elementi con pageSize=10 → totalPages=2
- Stato Passate: almeno 1–3 elementi
- Stato Cancellate: 0 elementi per validare empty state

Note su validazioni API
- Verificare che la richiesta includa correttamente i parametri (state, page, pageSize)
- Verificare che la risposta riporti metadati totalItems e totalPages coerenti

Bug/Anomalie da tracciare (esempi)
- Paginazione non si resetta alla prima pagina al cambio filtro
- Bottoni Avanti/Indietro non disabilitati ai bordi
- Discrepanza tra conteggio righe e metadati totalItems/pageSize
- Stato UI non allineato all’URL dopo refresh/back/forward

Output atteso
- Tutti gli scenari passano su browser target e risoluzioni indicate
- Ticket aperti per eventuali incongruenze UI/UX con steps to reproduce e screenshot
