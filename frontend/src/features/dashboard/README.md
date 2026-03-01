Dashboard (Mappa 12 postazioni) — Specifica UI/UX sintetica

Questa cartella contiene la struttura di componenti (scheletri) per implementare la dashboard mobile‑first con mappa delle 12 postazioni.

Riferimento completo a wireframe e specifica: ../../../../docs/ui/dashboard-mobile-wireframe.md

Componenti previsti
- pages/DashboardPage.tsx
  - Struttura base della pagina: Header, mappa, legenda, pannello dettagli.
  - Gestione flusso prenotazione: selezione nodo libero → apertura ConfirmBookingModal → conferma/annulla.
- components/StationsMap.tsx
  - Griglia responsive (3x4 mobile, 4x3 tablet, 6x2 desktop) di 12 nodi.
- components/StationNode.tsx
  - Nodo postazione tappabile/focusable con stato (available/busy/unavailable). Click disabilitato se non available.
- components/LegendBar.tsx
  - Legenda colori + timestamp ultimo aggiornamento.
- components/StationDetail.tsx
  - Pannello dettagli (bottom sheet su mobile, laterale su tablet/desktop).
- components/ConfirmBookingModal.tsx
  - Bottom sheet modale con titolo, messaggio e pulsanti "Conferma"/"Annulla". Mostra data e numero postazione.

Tipi e convenzioni
- types.ts definisce Station, StationStatus e costanti.
- Palette colori e classi CSS in: src/assets/styles/dashboard.css

Note
- Questi file sono placeholder/scheletri per facilitare l’implementazione.
- Non introducono dipendenze esterne. Le logiche dati/API verranno aggiunte in una iterazione successiva.
- Specifica del flusso di conferma prenotazione: ../../../../docs/ui/booking-confirmation-flow.md
