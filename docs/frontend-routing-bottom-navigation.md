# Routing Frontend, Bottom Navigation e Stato Data

Versione: 1.0  
Data: 17/01/2026  
Autore: Frontend Team  
Stato: Draft

---

Obiettivo
- Documentare architettura e integrazione della bottom navigation
- Descrivere lo schema di routing tra mappa e sezione "Le mie prenotazioni"
- Definire il meccanismo di gestione del contesto della data selezionata
- Fornire linee guida per estendere la bottom navigation mantenendo il contesto
- Collegare i test principali utili a future modifiche

Riferimenti codice sorgente (principali)
- Component BottomNavigation: frontend/src/components/BottomNavigation.tsx
- Layout protetto: frontend/src/router/ProtectedLayout.tsx
- Router app: frontend/src/router/AppRouter.tsx
- Guard autenticazione: frontend/src/router/ProtectedRoute.tsx
- Context data selezionata: frontend/src/context/SelectedDateContext.tsx
- Pagina mappa: frontend/src/pages/DashboardPostazioni.tsx
- Pagina Le mie prenotazioni: frontend/src/pages/MyBookingsPage.tsx

---

1) Architettura Bottom Navigation

Struttura del componente
- File: frontend/src/components/BottomNavigation.tsx
- Esporta <BottomNavigation/> con props opzionali { style?, className? }
- Struttura:
  - <nav role="navigation" aria-label="Navigazione principale"> contenente una <ul>
  - Ogni elemento è un <NavLink> verso una destinazione primaria
  - Gli item correnti applicano uno stile "active" (background blue-600) e non correnti "inactive" (gray-800)
  - Icone testuali semplici (emoji) con aria-hidden; label sempre visibile, contrasto AA

Destinazioni presenti
- /dashboard/mappa — mappa postazioni con polling stato
- /dashboard/prenotazioni — sezione "Le mie prenotazioni" (placeholder: integrazione API pianificata)

Accessibilità
- Dimensioni touch target >=44px
- aria-current gestita automaticamente da NavLink
- Color contrast conforme (gray-50 su gray-900; blue-600 su white)

---

2) Routing e Layout Protetto

- AppRouter definisce le route pubbliche (/login) e protette (/dashboard/*)
- ProtectedLayout incapsula la bottom nav e fornisce padding inferiore per evitare overlap contenuti
- Le pagine protette sono lazy-loaded con fallback di caricamento
- Prefetch proattivo delle due sezioni principali durante idle per migliorare la latenza percepita

---

3) Stato Data Condiviso

- SelectedDateContext è la fonte di verità per la data selezionata tra mappa e prenotazioni
- Sincronizza la data con la query `?date=YYYY-MM-DD` in URL per deep-link e refresh
- Normalizza a date-only in timezone locale

Interazione con le pagine
- DashboardPostazioni legge e modifica la data (per le future estensioni, es. filtri di disponibilità quotidiana)
- MyBookingsPage mostra la data e potrà usarla come filtro iniziale per l’elenco prenotazioni

---

4) Estensioni future e integrazione "Le mie prenotazioni"

- La pagina MyBookingsPage è attualmente un placeholder; si prevede l’integrazione con GET /api/bookings/me (vedi docs/my-bookings-data-and-api-spec.md)
- Ordinamento atteso: prenotazioni prossime in alto; paginazione keyset lato server
- La bottom nav resterà invariata; eventuali nuovi tab (Profilo, Impostazioni) possono essere aggiunti mantenendo il contesto data se rilevante

---

5) Testing/QA

- Verificare che la bottom navigation mantenga lo stato attivo corretto sui path
- Verificare che l’URL preservi `?date=...` quando si naviga tra le sezioni
- Verificare che il layout non sovrapponga la bottom nav ai contenuti su dispositivi mobile

Note
- Non sono presenti al momento API reali per l’elenco prenotazioni; vedere lo spec tecnico per la pianificazione backend/frontend.
