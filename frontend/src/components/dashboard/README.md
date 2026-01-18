Dashboard postazioni - Specifica UI/UX (Mobile-first)

Obiettivi
- Mostrare 12 postazioni in una mappa/griglia con stato: Libero, Occupato, Non disponibile
- Navigazione e interazioni ottimizzate per schermi mobili

Layout
- Header sticky con titolo e pulsante refresh
- Area mappa come griglia 3x4 (mobile portrait), auto-fit su tablet/desktop
- Legenda persistente (chip colorati) in basso su mobile, laterale/inline su tablet/desktop
- FAB di refresh su mobile per accesso rapido

Responsive
- <600px: 3 colonne, celle tappabili 84px+, bottom sheet per dettagli
- 600-1024px: 4 colonne, max-width 920px centrata, legenda inline
- >1024px: griglia 6 colonne e pannello info affiancato
- Fallback very-small: 2 colonne, celle 64px, possibile vista lista futura

Interazioni
- Tap su cella: apre dettagli con stato, label, id, CTA Prenota (attiva solo se Libero)
- Pulsante refresh (header e FAB): aggiorna stato mappa
- Accessibilità: role=grid/gridcell, aria-label con stato, focus ring, hit area 44x44

Palette colori
- Libero: base #1B9E77, dark #12775A, soft #E6F4F1
- Occupato: base #D95F02, dark #A54801, soft #FBEDE3
- Non disponibile: base #757575, dark #555555, soft #EEEEEE
- Testi su chip: bianco; contrasti >= 4.5:1

Tecnico (componenti)
- <Dashboard />: presentazionale, props: desks, onRefresh, onBook
- Styling inline CSS-in-JS (styles.tsx) per prototipo; migrabile a CSS modules
- Tipi in types.ts (Desk, DeskStatus)

Wireframe
- Vedere DashboardMobileWireframe.md per ASCII e note aggiuntive
