Documentazione tecnica — Bottom navigation, routing e stato data selezionata
Versione: 1.0 — 2026-01-17

Obiettivo
- Descrivere l’architettura della bottom navigation e la sua integrazione nel layout dell’app.
- Definire lo schema di routing tra la dashboard con mappa e la sezione “Le mie prenotazioni”.
- Standardizzare il meccanismo di gestione del contesto della data selezionata, condiviso fra sezioni.
- Fornire linee guida per estendere la bottom navigation mantenendo il contesto.
- Collegare i test principali (unit/integration) che coprono questo comportamento.

1) Architettura bottom navigation

Componenti e posizione
- AppShell: componente di layout che rende in modo persistente l’header opzionale, il contenuto centrale (outlet del router) e la BottomNav fissata in fondo allo schermo.
  - Posizionamento: frontend/src/app/layout/AppShell.tsx (convenzione suggerita)
- BottomNav: componente presentazionale che mostra le tab primarie (Dashboard, Le mie prenotazioni, …) e gestisce la navigazione.
  - Posizione: frontend/src/features/navigation/BottomNav.tsx (convenzione suggerita)

Struttura del componente BottomNav
- Props minime: currentPath (opzionale se si usa il router hook), onNavigate(path: string)
- Rendering: lista di item configurabili con icona e label.
- Classi/CSS: 
  - .bottom-nav (contenitore fisso), 
  - .bottom-nav__item, .bottom-nav__item--active, 
  - .bottom-nav__icon, .bottom-nav__label.
- Accessibilità: role="navigation", aria-label="Navigazione principale"; ogni item è un link <a> o <button> con aria-current="page" quando attivo.

Integrazione layout
- App entry point: AppShell wrappa il Router e include <BottomNav /> al di fuori dell’outlet così da restare stabile tra le route.
- Mobile-first: BottomNav è visibile su mobile; su desktop può diventare una side-nav o rimanere, a discrezione del tema.

Naming e convenzioni
- Componenti: BottomNav, BottomNavItem, AppShell.
- Config: NAV_ITEMS in frontend/src/features/navigation/navConfig.ts (array di { path, label, icon, requiresAuth? }).
- Route constants: ROUTES in frontend/src/app/routing/routes.ts (HOME: '/', BOOKINGS: '/my-bookings', ecc.).

2) Schema di routing

Router
- Libreria prevista: React Router (o equivalente). La documentazione resta agnostica al framework ma usa questa semantica.
- Outlet: AppShell posiziona <Outlet /> per il contenuto della pagina corrente.

Route principali
- '/': DashboardPage (mappa 12 postazioni)
  - Query param opzionali: 
    - date=YYYY-MM-DD (sincronizzazione/Deep-Link della data selezionata, vedi sezione 3)
- '/my-bookings': MyBookingsPage (lista/scheda delle prenotazioni dell’utente)
  - Guard: richiede autenticazione (ProtectedRoute) — usa AuthContext.isAuthenticated o token presente.
  - Query param opzionali: 
    - date=YYYY-MM-DD (per preservare/forzare la data di riferimento quando si arriva dalla mappa)

Guard e comportamento stack
- ProtectedRoute: reindirizza a '/auth/login' se non autenticato; dopo login ritorna alla route richiesta (state.from).
- Navigazione bottom-tab: sostituisce la pagina corrente nella history (navigate(path, { replace: true })) per evitare stack profondi passando tra tab principali.
- Navigazione interna (es. dettagli): push standard (replace: false) così che il back porti alla tab precedente.

3) Gestione dello stato della data selezionata

Obiettivo
- Un unico “single source of truth” per la data, condiviso tra Dashboard e MyBookings, con supporto a deep-link via query param.

Sorgente dello stato
- DateContext (React Context) con provider a livello di AppShell.
  - File suggeriti: 
    - frontend/src/app/state/DateContext.tsx (Provider + hook useDate())
    - frontend/src/app/state/dateStorage.ts (persistenza opzionale)
- Forma stato: { selectedDate: Date, selectedDateIso: string, setSelectedDate(d: Date): void }

Aggiornamento e consumo
- DashboardPage: 
  - Legge selectedDate dal context per determinare la mappa e i badge; all’azione utente (selettore o conferma prenotazione) può aggiornare setSelectedDate.
  - Sincronizza l’URL scrivendo ?date=YYYY-MM-DD quando cambia la data (senza ricarico pagina).
- MyBookingsPage: 
  - Consuma selectedDate per filtrare/ordinare le prenotazioni o impostare il mese corrente del calendario.
  - Può modificare la data (es. nel DatePicker) e il cambiamento è visibile tornando alla Dashboard.

Regole di default e edge case
- Default: oggi (timezone locale). 
- Persistenza: opzionale via localStorage (chiave 'selected_date'). Se presente e valida, diventa il valore iniziale del context.
- URL first: se la route contiene ?date=YYYY-MM-DD valida, questa prevale su storage e default e aggiorna il context all’entrata.
- Giorni bloccati: se la data iniziale è chiusa (domenica/festività), mantenere comunque il valore nel context (per trasparenza), ma:
  - UI disabilita le azioni corrispondenti (già coperto dal DatePicker e dalla logica di prenotazione).
  - Alla conferma prenotazione il backend valida e ritorna errore COWORKING_CLOSED (gestito con messaggio chiaro).
- Date non valide: se la query contiene un formato non valido, ignorare la query e ricadere su storage/default.

4) Linee guida per estendere la bottom navigation

Aggiungere una nuova sezione (es. "Profilo")
1. Definire la route in ROUTES (frontend/src/app/routing/routes.ts).
2. Creare la pagina / feature sotto frontend/src/features/<feature>/pages.
3. Aggiungere un item in NAV_ITEMS ({ path, label, icon, requiresAuth? }).
4. Aggiornare BottomNav per leggere NAV_ITEMS e renderizzare automaticamente la nuova voce.
5. Se la sezione deve mantenere il contesto data:
   - Consumare useDate() e, se necessario, sincronizzare/leggere il query param 'date'.
   - Evitare di forzare la data salvo intenzione esplicita dell’utente.
6. Per route protette, wrappare con ProtectedRoute e assicurare la UX di redirect-back dopo login.

Standard di naming
- Componenti: PascalCase (BottomNav, AppShell, MyBookingsPage).
- Hook: useDate, useAuth.
- File di config: navConfig.ts, routes.ts.
- Chiavi di storage: 'selected_date'.
- Parametri URL: 'date' per tutte le sezioni che vogliono partecipare al contesto.

5) Test principali (unitari e di integrazione)

Nota: se non presenti in repo, usare questi riferimenti come guida per l’implementazione.

Unit test
- DateContext
  - Path atteso: frontend/src/app/state/__tests__/DateContext.test.tsx
  - Casi: default today, init from storage, override from URL, setSelectedDate propaga ai consumer, formato invalid date ignorato.
- BottomNav
  - Path atteso: frontend/src/features/navigation/__tests__/BottomNav.test.tsx
  - Casi: item attivo in base al path, navigate chiamato al click, rispetto di requiresAuth.

Integration test (con router)
- Routing e persistenza data tra tab
  - Path atteso: frontend/src/app/__tests__/routing.bottomnav.integration.test.tsx
  - Casi: 
    - Passaggio Dashboard → MyBookings mantiene selectedDate.
    - Digitando URL con ?date=YYYY-MM-DD la pagina inizializza il context coerentemente.
    - ProtectedRoute su /my-bookings reindirizza al login se non autenticati e ritorna alla pagina dopo login.

Riferimenti utili
- DatePicker e blocco festività: frontend/src/features/booking/components/DatePicker.tsx e utilities correlate.
- DashboardPage (uso della data e prenotazione): frontend/src/features/dashboard/pages/DashboardPage.tsx.
- Auth layer: 
  - tokenStorage, httpClient, authInterceptor in frontend/src/app e features/auth.

Appendice — Flussi di sincronizzazione data
- In entrata pagina: URL (?date) → Context → Storage
- In uscita/azione utente: Context (setSelectedDate) → URL (?date) → Storage (opzionale)

Questa documentazione è allineata alla story: "Bottom navigation e routing tra dashboard mappa e sezione 'Le mie prenotazioni'" e fornisce le convenzioni operative per implementare le prossime iterazioni senza regressioni sul contesto data e sulla UX di navigazione.