# Navigazione, Routing e Gestione della Data Selezionata

Questo documento descrive l'architettura della bottom navigation, lo schema di routing tra la dashboard mappa e la sezione "Le mie prenotazioni", e il meccanismo di gestione del contesto della data selezionata.

Indice
- Architettura bottom navigation
- Schema di routing e guard
- Gestione dello stato della data selezionata
- Linee guida per estendere la bottom navigation mantenendo il contesto
- Riferimenti a test

---

Architettura bottom navigation

Componenti e struttura
- Componente: frontend/src/components/Navigation/BottomNavigation.tsx
- Props: { basePath?: string } con default '/dashboard'
- Rendering: NavLink di react-router-dom per le voci
- Voci default:
  - key: 'map'  -> label: 'Mappa'                   -> route: `${basePath}/mappa`
  - key: 'bookings' -> label: 'Le mie prenotazioni' -> route: `${basePath}/prenotazioni`
- Accessibilità: role="navigation" e aria-label
- Stato di attivazione: usa NavLink per applicare stile attivo in base alla route corrente (prop end per la voce mappa)
- Stili: inline CSS, barra fissa in basso (position: fixed) con border-top e target touch-friendly

Integrazione nel layout
- La bottom navigation è pensata per essere persistente nel layout dell'area autenticata (es. dashboard). Inserirla nel layout/shell che racchiude le pagine principali, tipicamente sopra al router outlet ma sotto ai contenuti per garantire visibilità costante.
- Esempio d'uso:
  - <SelectedDateProvider>
    - <Routes>
      - <Route path="/dashboard/*" element={<DashboardLayout />}/>
    - </Routes>
    - <BottomNavigation basePath="/dashboard" />
  - </SelectedDateProvider>
- Nota: mantenere la posizione fixed consente una UX mobile-like coerente.

Convenzioni di naming
- Keys delle voci: snake/camel case brevi e stabili (es. 'map', 'bookings')
- Labels: localizzabili, in italiano per default ('Mappa', 'Le mie prenotazioni')
- Path: segmenti leggibili e stabili ("mappa", "prenotazioni"). Evitare di codificare la data nel path: è gestita via query string (?date=YYYY-MM-DD) come contesto condiviso.

---

Schema di routing e guard

Rotte principali
- /dashboard/mappa
  - Vista mappa principale (elenco/situazione postazioni)
  - Consuma e aggiorna la data selezionata
- /dashboard/prenotazioni
  - Sezione "Le mie prenotazioni" filtrata per data selezionata

Parametri e query
- Query condivisa: ?date=YYYY-MM-DD
  - Viene mantenuta e sincronizzata tra le schermate
  - Non è parte del path, per semplificare deep-link e condivisione

Guard e comportamento dello stack
- Le aree principali sotto /dashboard dovrebbero essere protette con ProtectedRoute (se configurata), ma la bottom navigation è framework-agnostica e usa solo NavLink.
- Aggiornamenti della sola data non devono sporcare la history: SelectedDateProvider usa navigate(..., { replace: true }) durante la sincronizzazione per evitare di accodare entry quando cambia solo la query.

---

Gestione dello stato della data selezionata

Dove è definito
- Context React: frontend/src/context/SelectedDateContext.tsx
  - API: useSelectedDate() -> { date: string; setDate(next: string | Date) }
  - Provider: <SelectedDateProvider>

Inizializzazione e default
- All'avvio legge la query ?date dalla location
- Se non presente o non valida, imposta il valore di default a "oggi" (in locale) nel formato YYYY-MM-DD

Validazione e normalizzazione
- isValidYmd: verifica forma YYYY-MM-DD e coerenza calendario (usa Date.UTC per evitare ambiguità)
- toYmd: normalizza Date in locale (getFullYear/getMonth/getDate) in YYYY-MM-DD
- setDate ignora input non valido

Sincronizzazione con l'URL
- Effetto 1: ogni volta che cambia lo stato date, aggiorna la query string della location corrente (replace:true) mantenendo il pathname attuale
- Effetto 2: se l'utente atterra su una pagina con una query ?date diversa (deep link), lo stato viene aggiornato di conseguenza
- Preservazione: se si naviga tra /mappa e /prenotazioni senza query, lo stato interno mantiene la data attuale e il provider la riallineerà alla query

Aggiornamenti lato mappa e consumo lato prenotazioni
- Mappa: invoca setDate quando l'utente seleziona un nuovo giorno (es. tap su calendario o pulsanti +/-)
- Prenotazioni: legge date via useSelectedDate().date per filtrare/elencare prenotazioni del giorno

Edge case e regole
- Date non valide: vengono ignorate e non aggiornano lo stato
- Deep link con ?date futuro/passato: è accettato se valido
- Timezone: il valore è trattato come data "di calendario" in orario locale dell'utente; l'uso di Date.UTC in validazione serve a evitare slittamenti in casi limite, ma non modifica il significato locale della data
- History: le sole variazioni di date non aggiungono entry (replace) così il back button resta prevedibile

---

Linee guida per estendere la bottom navigation mantenendo il contesto

Aggiungere una nuova sezione
- Aggiungere una voce all'array items in BottomNavigation.tsx: { key: 'nome', label: 'Nome', to: `${basePath}/nome` }
- Creare la rotta corrispondente sotto /dashboard (o basePath scelto)
- Se la nuova sezione deve rispettare la data selezionata:
  - Leggere la data tramite useSelectedDate()
  - Evitare di gestire manualmente la query: il provider sincronizza automaticamente lo stato con la URL

Navigazione programmatica
- Per navigare mantenendo il contesto, è sufficiente chiamare navigate('/dashboard/nome') senza gestire ?date: il provider si occuperà di riallineare la query con replace
- Se si passa esplicitamente una data diversa, chiamare setDate prima o dopo la navigazione; il provider aggiornerà la query coerentemente

Naming e consistenza
- Usare key stabili e path semplici
- Mantenere aria-label significativi per accessibilità
- Evitare hardcode della base '/dashboard' al di fuori del layout: passare basePath come prop se il layout è riusabile

Test e verifiche suggerite
- Verificare che la query ?date venga mantenuta attraversando le tab
- Verificare che l'attivazione delle voci (stile attivo) rispecchi correttamente la route
- Verificare che le variazioni di data non aumentino la lunghezza della history (replace)

---

Riferimenti a test

Unitari/Component
- Bottom navigation: frontend/src/components/Navigation/__tests__/ (test di rendering, attivazione NavLink, accessibilità)
- Gestione data: frontend/src/context/__tests__/ (sincronizzazione query <-> stato, validazione, replace della history)

Integrazione/End-to-End (se presenti nella codebase)
- Dashboard e prenotazioni: frontend/src/components/Dashboard/__tests__/ e frontend/src/components/Booking/__tests__/ (consumo della data per filtrare contenuti)

Nota: i percorsi sopra indicano la collocazione prevista/standard dei test nel progetto; adeguare i riferimenti se i nomi dei file differiscono nel vostro branch.

---

Appendice: snippet rapidi

- Lettura/aggiornamento data in una pagina:
  - const { date, setDate } = useSelectedDate();
  - <button onClick={() => setDate(new Date())}>Oggi</button>

- Aggiunta voce bottom nav:
  - const items = [
    { key: 'map', label: 'Mappa', to: `${basePath}/mappa` },
    { key: 'bookings', label: 'Le mie prenotazioni', to: `${basePath}/prenotazioni` },
    { key: 'reports', label: 'Report', to: `${basePath}/report` }, // nuova voce
  ];
