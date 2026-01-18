SmartDesk Frontend - Navigazione, Routing e Stato della Data (Addendum)

Questo documento integra architecture.md con il dettaglio del comportamento di navigazione introdotto dalla bottom navigation e dal routing tra la dashboard mappa e la sezione "Le mie prenotazioni", includendo note sul contesto della data condiviso.

Overview
- L’app utilizza un RouterProvider custom (frontend/src/lib/router) esposto via hook useCurrentPath e useRouter.navigate.
- Il componente App.tsx monta:
  - <Routes />: responsabile del rendering condizionale dei segmenti principali e della normalizzazione delle route legacy.
  - <BottomNavigation />: sempre montata, gestita come fratello dell’area contenuti, con onNavigate per pilotare la history.
- I segmenti principali sono caricati in lazy: Dashboard mappa e MyBookings.
- Prefetch incrociato: quando attivi su una sezione, la controparte viene precaricata in background per migliorare i tempi di transizione.

Bottom Navigation
- Struttura: components/navigation/BottomNavigation (component stateless con items configurabili e callback onNavigate(href)).
- Integrazione: montata nel componente Navigation (in App.tsx), sotto RouterProvider, fratello della gerarchia di contenuto.
- Naming convenzioni:
  - Rotte canoniche: /dashboard/mappa, /dashboard/prenotazioni.
  - Alias legacy supportato: /le-mie-prenotazioni (reindirizzato al canonico in futuro).
  - Keys suggerite per items: map, bookings.
- Layout: l’area contenuti applica paddingBottom: 72px per evitare overlap.

Schema Routing
- Normalizzazioni iniziali: "/" e "/dashboard" vengono reindirizzate a "/dashboard/mappa" via useEffect in Routes.
- Rendering per prefissi:
  - path.startsWith("/dashboard/mappa") → Dashboard mappa
  - path.startsWith("/dashboard/prenotazioni") o path.startsWith("/le-mie-prenotazioni") → MyBookings
  - Altrimenti → fallback 404 con CTA a "/dashboard/mappa".
- Guard: nessun guard interno nella bottom navigation; eventuali guard di auth appartengono al layer RouterProvider o alle pagine specifiche.

Stato della Data
- Obiettivo: condividere la data selezionata tra mappa e prenotazioni.
- Definizione: fornita da un provider alto livello (AppProviders o provider dedicato in lib/date), esposta con hook (es. useSelectedDate, setSelectedDate).
- Aggiornamento (producer): la mappa emette cambi data; un container intercetta e aggiorna il contesto.
- Consumo (consumer): MyBookings legge dal contesto per filtrare/inizializzare la UI.
- Regole:
  - Default: oggi (TZ locale), stabile anche con navigazione tra sezioni.
  - Input invalido: ripristino a oggi con warning non bloccante.
  - Persistenza opzionale in query string (?date=YYYY-MM-DD) con helper condiviso; fallback a default se invalida.

Linee Guida Estensione
- Aggiungere una nuova sezione:
  1) Creare modulo lazy components/<sezione>/<Componente>.tsx
  2) Definire rotta canonica /dashboard/<sezione>
  3) Estendere lo switch in Routes e, se utile, aggiungere prefetch incrociato
  4) Aggiungere item nella BottomNavigation con href, label e determinate attivo da path corrente
  5) Se usa la data, consumare il contesto esistente senza re-inizializzarlo

Test e riferimenti
- Copertura consigliata:
  - Test unitari del router per redirect di default
  - Test di interazione BottomNavigation (onNavigate, attivo)
  - Test di integrazione di routing tra sezioni e fallback 404
  - Test del DateContext (default, update, resilienza a input invalido)
- Vedi docs/frontend/navigation-routing-date.md per esempi e percorsi suggeriti dei test.

Note
- Mantenere allineata la documentazione con App.tsx quando si modificano le rotte o la strategia di prefetch.
- Adeguare il paddingBottom se l’altezza della bottom bar cambia.
