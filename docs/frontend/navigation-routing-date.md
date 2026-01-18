Titolo: Bottom navigation, routing tra Dashboard Mappa e "Le mie prenotazioni" e gestione dello stato data

Scopo
- Documentare l’architettura della bottom navigation, lo schema di routing tra la dashboard mappa e la sezione "Le mie prenotazioni" e il meccanismo di gestione del contesto della data selezionata.
- Fornire linee guida per estendere la bottom navigation mantenendo la coerenza del layout e del contesto applicativo.

Contesto e integrazione
- Il layout applicativo integra una bottom navigation fissa ed un’area contenuti superiore. La bottom navigation è sempre montata e non subisce rimontaggi durante la navigazione; l’area contenuti cambia in base alla route.
- Inizializzazione e composizione principali sono in frontend/src/App.tsx:
  - RouterProvider fornisce il contesto di routing (hook useCurrentPath, useRouter.navigate).
  - Routes (componente interno) risolve il rendering condizionale dei due macro-segmenti: mappa e prenotazioni, oltre a gestire normalizzazioni/redirect legacy.
  - BottomNavigation viene montata fuori dall’area contenuti e riceve onNavigate per pilotare i cambi di route.
  - L’area contenuti applica un padding-bottom fisso (72px) per evitare sovrapposizione con la bottom navigation.

Architettura Bottom Navigation
- Componente: components/navigation/BottomNavigation
- Responsabilità:
  - Mostrare le principali sezioni di livello superiore dell’app (ad es. Mappa, Le mie prenotazioni).
  - Esporre una callback onNavigate(href: string) per consentire al container di effettuare la navigazione (pattern di inversione del controllo).
  - Evidenziare lo stato attivo in base alla route corrente (derivabile via hook useCurrentPath oppure passato dal container come prop se necessario).
- Punti di integrazione:
  - Montata nel componente Navigation in App.tsx, sotto al RouterProvider, fratello dell’area contenuti.
  - L’area contenuti in Routes applica paddingBottom: 72px per non essere coperta dalla bottom bar (coerenza con dimensionamento del componente).
- Convenzioni di naming:
  - Rotte canoniche: 
    - /dashboard/mappa
    - /dashboard/prenotazioni (alias legacy: /le-mie-prenotazioni)
  - Id/chiavi di item suggerite: "map" e "bookings"; label localizzabili; icone coerenti con la design system.
  - Data-testid (se usato): navbar-bottom, navbar-item-map, navbar-item-bookings.

Schema di routing
- Entry points e normalizzazione (gestita in App.tsx, componente Routes):
  - "/" → redirect a "/dashboard/mappa"
  - "/dashboard" → redirect a "/dashboard/mappa"
- Rotte principali e comportamento:
  - "/dashboard/mappa": render di Dashboard mappa (components/dashboard/Dashboard, caricamento lazy).
  - "/dashboard/prenotazioni" e "/le-mie-prenotazioni": render di "Le mie prenotazioni" (components/bookings/MyBookings, caricamento lazy). 
    - "le-mie-prenotazioni" è un alias mantenuto per compatibilità, ma la route canonica è "/dashboard/prenotazioni".
- Prefetch ottimizzato:
  - Quando si è su mappa, si pre-carica il chunk di prenotazioni in background, e viceversa, per transizioni rapide.
- Fallback 404 in-app:
  - Per rotte non riconosciute, viene renderizzata una pagina 404 con azione per tornare alla mappa.
- Guard e stack di navigazione:
  - La bottom navigation rimane montata; lo stack è delegato al RouterProvider e alla history del browser.
  - Eventuali guard di autenticazione si collocano a livello di RouterProvider o dei singoli container; la bottom navigation non implementa guard diretti.

Gestione dello stato della data selezionata
- Obiettivo: mantenere un contesto di data condiviso tra mappa e prenotazioni per consultare e prenotare in modo coerente.
- Definizione dello stato:
  - Lo stato della data è fornito a livello alto dell’applicazione (via provider contestuale incluso in AppProviders o in un provider dedicato nel layer lib/). 
  - Si consiglia un DateContext con hook: useSelectedDate(): Date | string e setSelectedDate(next: Date | string): void.
- Aggiornamento dalla mappa (producer):
  - La dashboard mappa aggiorna la data selezionata quando l’utente interagisce con la timeline/agenda o seleziona un giorno specifico.
  - Pattern consigliato: sollevare l’intento di cambio data tramite callback nel componente Dashboard; la logica di aggiornamento vive nel container e propaga nel contesto.
- Consumo in "Le mie prenotazioni" (consumer):
  - La sezione prenotazioni legge lo stato data per filtrare le prenotazioni del giorno selezionato o per impostare la data di default nella UI (es. date picker).
  - Il consumo dovrebbe essere resiliente a valori transienti (es. durante il caricamento iniziale, se la data non è ancora pronta, usare un loading state leggero o un fallback alla data di default).
- Regole di default e edge case:
  - Default: oggi (inizializzato in base al fuso orario locale dell’utente). 
  - Valori non validi: se la data è null/undefined o mal formata, ripristinare "oggi" e loggare un warning non invasivo (no error blocking).
  - Cambio fuso orario: se la data è memorizzata come YYYY-MM-DD (stringa), i cambi di TZ non alterano il significato del giorno; se è Date, normalizzare a mezzanotte locale per evitare slittamenti di giorno.
  - Navigazione rapida: tra mappa e prenotazioni lo stato persiste; evitare rimontaggio del provider di data.
  - Persistenza opzionale: è possibile sincronizzare la data nel query string (?date=YYYY-MM-DD) per deep-linking; in assenza o valore invalido si usa il default.

Linee guida per estendere la bottom navigation
- Aggiungere una nuova sezione (es. Profilo) mantenendo il contesto:
  1) Creare la nuova pagina come modulo lazy (es. components/profile/Profile.tsx) per preservare le performance del primo paint.
  2) Definire una rotta canonica sotto /dashboard/<sezione> (es. /dashboard/profilo). 
  3) Integrare in Routes: 
     - Aggiungere il ramo di rendering condizionale per la nuova path (e opzionale prefetch incrociato con le sezioni esistenti).
     - Garantire il paddingBottom: 72px per evitare overlap con la bottom bar.
  4) Estendere BottomNavigation:
     - Aggiungere un item con href alla nuova rotta canonica e label localizzabile.
     - L’item deve determinare l’attivo in base alla current path (pattern già usato dagli item esistenti).
  5) Contesto di data:
     - Se la nuova sezione necessita della data, usare gli hook di contesto per leggere/aggiornare senza duplicare stato locale.
     - Evitare side-effect che resettano la data al mount; rispettare il valore corrente del contesto.
  6) Naming e compatibilità:
     - Usare nomi di route in minuscolo separati da trattini o al singolare coerenti con le esistenti (prenotazioni, mappa, profilo).
     - Se necessario un alias legacy, aggiungere una normalizzazione nel blocco di useEffect in Routes.

Esempi di integrazione (estratti semplificati)
- In App.tsx
  - Redirect/normalizzazione iniziale:
    - if (path === '/') navigate('/dashboard/mappa');
    - if (path === '/dashboard') navigate('/dashboard/mappa');
  - Prefetch:
    - Se path inizia con /dashboard/mappa → import('./components/bookings/MyBookings')
    - Se path inizia con /dashboard/prenotazioni → import('./components/dashboard/Dashboard')
  - Layout:
    - <Routes /> per i contenuti con paddingBottom: 72px
    - <BottomNavigation onNavigate={(href) => navigate(href)} /> montata fuori dai contenuti

Testing: riferimenti e copertura attesa
- Tipologie di test consigliate per questa funzionalità:
  - Unit test per il router: verifica della normalizzazione ("/" e "/dashboard" → "/dashboard/mappa").
  - Unit test per BottomNavigation: attivazione corretto dell’item in base alla path corrente e chiamata onNavigate con l’href atteso.
  - Integration test di routing: transizione tra mappa e prenotazioni, verifica del prefetch opportunistico (si può usare un mock/spy su import dinamici).
  - Unit/Integration per DateContext: default oggi, aggiornamento dalla mappa, consumo in prenotazioni, reset su input invalido.
- Percorsi di test (pattern generici nella cartella frontend/test/):
  - frontend/test/router/RouterProvider.spec.ts (routing e normalizzazione)
  - frontend/test/components/navigation/BottomNavigation.spec.ts (interazione e stato attivo)
  - frontend/test/flows/routing.int.spec.ts (transizioni tra sezioni e 404 fallback)
  - frontend/test/lib/date/DateContext.spec.ts (comportamento del contesto data)
  - Nota: i nomi sopra sono indicativi; mantenere i test vicino ai moduli corrispondenti seguendo le convenzioni esistenti del progetto.

Note operative
- Evitare side-effect non deterministici nei componenti che leggono la data: la state machine della data deve essere uni-direzionale (producer → context → consumer).
- Mantenere la nomenclatura delle route consistente (preferire la forma canonica /dashboard/prenotazioni; mantenere gli alias solo per retro-compatibilità).
- Se si aggiunge la sincronizzazione della data in query string, consolidare la logica di parse/serialize in un helper condiviso (lib/date/urlState.ts).
- Ricordarsi di aggiornare il paddingBottom se l’altezza della bottom bar cambia.

Changelog
- 2026-01-18: Prima versione della documentazione per bottom navigation, routing e gestione data; allineata all’implementazione in App.tsx con lazy load e prefetch incrociato.
