SmartDesk - Dashboard postazioni (mobile-first)

Scopo
- Visualizzare mappa interattiva con 12 postazioni e stato in tempo reale.
- Ottimizzata per mobile, con adattamento base tablet/desktop.

1) Layout principale (mobile-first)
- Header compatto (56px): titolo "Postazioni", badge stato globale, icona refresh.
- Area mappa (flex:1): griglia 3x4 (portrait) con 12 slot tappabili.
- Status bar/legenda persistente (auto-collapse): 3 chip con colore e label.
- Floating Action Button (FAB) di refresh in basso a destra su mobile; su desktop pulsante nella toolbar.

Struttura DOM proposta
- <header class="sd-header"> titolo + azioni
- <main class="sd-map"> griglia postazioni
- <aside class="sd-legend"> legenda

2) Responsive behavior
- Mobile (<600px):
  - Griglia 3 colonne x 4 righe, cell ~min(28vw, 120px). Label dentro cell con tooltip.
  - FAB visibile.
  - Header sticky, legenda in bottom sheet comprimibile (24px handle).
- Tablet (600-1024px):
  - Griglia 4x3 o 6x2 (auto-fit) max-width 920px centrata.
  - Legenda laterale destra verticale.
  - Pulsante refresh nella toolbar (no FAB).
- Desktop (>1024px):
  - Layout a 2 colonne: mappa (70%) + pannello info (30%) quando una postazione è selezionata.
  - Hover effect per accesso mouse; click = selezione.

3) Interazioni minime
- Tap/click su postazione: apre sheet/modale con
  - Stato (icona + colore), label, id, ultima attività.
  - Azione primaria: "Prenota" (link alla pagina prenotazione esistente) se stato=free.
  - Se occupied o unavailable: mostra info e CTA disabilitata o link alla coda/altre postazioni.
- Pull-to-refresh su mobile (se supportato) oppure FAB.
- Long-press ( >500ms ): mostra azioni extra (es. segnalazione problema) – opzionale.

4) Palette colori e codifica visiva (WCAG mindful)
- Free: #1B9E77 (verde) base; outline/scuro: #12775A; bg soft: #E6F4F1
- Occupied: #D95F02 (arancio) base; outline: #A54801; bg soft: #FBEDE3
- Unavailable: #757575 (grigio) base; outline: #555555; bg soft: #EEEEEE
- Contrasto testi minimo 4.5:1 su badge/chip; usare testo scuro su bg soft e bianco su chip pieni.
- Pattern/texture per daltonismo: icone + pattern a strisce sottili per unavailable.
- Stato codificato anche da icona:
  - Free: ✓
  - Occupied: ⏳/●
  - Unavailable: ✕

5) Fallback schermi molto piccoli (<360px altezza o larghezza)
- Modalità lista compatta (due colonne): card 56px con puntatore colore + label.
- Toggle "Mappa | Lista" sempre visibile.

Wireframe low-fidelity (ASCII)

Mobile portrait (3x4)
+--------------------------------------+
| ▷ Postazioni             ⟳           |
+--------------------------------------+
| [ 1 ][ 2 ][ 3 ]                     |
| [ 4 ][ 5 ][ 6 ]                     |
| [ 7 ][ 8 ][ 9 ]                     |
| [10 ][11 ][12 ]                     |
+--------------------------------------+
| ● Verde Libero  ● Arancio Occupato   |
| ✕ Grigio N/D                        |
|             ⊕ FAB Refresh            |
+--------------------------------------+

Tablet/desktop (es.)
+------------------+-------------------+
| Header/Toolbar   | Legenda           |
+------------------+-------------------+
|  Griglia auto-fit  (max 920px)       |
|                                      |
|  [cells]                             |
+------------------+-------------------+

States chips (esempio)
[✓ Libero] [⏳ Occupato] [✕ N/D]

Note accessibilità
- Focus ring visibile (2px outline) su celle e pulsanti.
- Hit area minima 44x44px.
- Annunci ARIA: role=grid, gridcell, aria-selected, aria-label con stato.
- Preferenze motion: ridurre animazioni se prefers-reduced-motion.
