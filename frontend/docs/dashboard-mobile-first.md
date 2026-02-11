# Dashboard mobile-first – Mappa 12 postazioni

Versione: 1.0  
Data: 18/01/2026  
Autore: UI/UX + Frontend

Obiettivo
- Definire il layout mobile‑first della dashboard che mostra una mappa interattiva con 12 postazioni.
- Specificare: struttura UI, comportamento responsive, interazioni minime, palette e codifica visiva accessibile, fallback small-screen.
- Fornire wireframe a bassa fedeltà per allineamento team.

Requisiti funzionali minimi
- Visualizzare 12 postazioni su una mappa interattiva.
- Tap su postazione: mostrare pannello dettagli con stato e info base, azione Prenota (link a pagina prenotazione esistente o placeholder /booking/:deskId).
- Pulsante Refresh per aggiornare lo stato (manuale). Opzionale: polling passivo 15–30s.
- Legenda con codifica visiva degli stati (libero, occupato, non disponibile).

1) Layout principale (mobile‑first)
- Header (sticky, top):
  - Titolo: “Mappa postazioni”
  - Azioni: bottone Refresh (icona ↻), eventuale icona profilo/menu.
- Area mappa (contenitore responsive, 16:9 o 4:3, full width):
  - Mappa SVG responsive (viewBox), con 12 marker postazione posizionati percentualmente.
  - Ogni postazione è interattiva (button/aria‑role), stato reso via colore, icona e label breve.
- Legenda/Status bar (sticky, bottom):
  - Tre chip/badge con colore+icona+etichetta: Libero, Occupato, Non disponibile, con contatori.
- Bottom sheet dettagli (on tap):
  - Nome/ID postazione, stato, info base (es. ultimo aggiornamento), azione Prenota (primary) + Chiudi.

Wireframe (bassa fedeltà)

Mobile (portrait ~390×844)

+------------------------------------------------+
|  Header:  Mappa postazioni           [ ↻ ]     |
+------------------------------------------------+
|                                                |
|  [           AREA MAPPA (SVG 16:9)           ] |
|  |  ● D01    ✕ D02    ▦ D03                 | |
|  |  ● D04    ✕ D05    ▦ D06                 | |
|  |  ● D07    ✕ D08    ▦ D09                 | |
|  |  ● D10    ✕ D11    ▦ D12                 | |
|  [--------------------------------------------] |
|                                                |
+------------------------------------------------+
|  Legenda:  ● Libero (8)   ✕ Occupato (3)  ▦ ND(1) |
+------------------------------------------------+

Bottom sheet (dopo tap su D05)

+------------------------------------------------+
|  Postazione D05                                 |
|  Stato: ✕ Occupato                              |
|  Ultimo aggiornamento: 10:32                    |
|  [ Prenota ] (disabled se non libero)  [Chiudi] |
+------------------------------------------------+

Tablet (landscape ≥ 768px)

+---------------------------------------------------------------+
| Header: Mappa postazioni                         [ ↻ ] [👤]    |
+----------------------------+----------------------------------+
|        AREA MAPPA (SVG)    |   Pannello dettagli (sticky):    |
|  [ markers 12 posizioni ]  |   - Selezione corrente           |
|                            |   - Stato, info, pulsanti        |
+----------------------------+----------------------------------+
| Legenda:  ● Libero   ✕ Occupato   ▦ Non disp.  (con contatori) |
+---------------------------------------------------------------+

Desktop (≥ 1024px)
- Layout simile al tablet: mappa a sinistra, pannello dettagli a destra, legenda in bottom bar.

2) Comportamento responsive
- Breakpoint suggeriti:
  - Mobile: < 600px
  - Tablet: 600–1024px
  - Desktop: ≥ 1024px
- Mobile (< 600px):
  - Header sticky, mappa in contenitore ratio 16:9 con width: 100%.
  - Marker cliccabili con target minimo 44×44 px (accessibilità touch).
  - Dettagli in bottom sheet full‑width.
- Tablet (≥ 600px):
  - Layout a 2 colonne: mappa (≈ 60–65% width) + pannello dettagli (≈ 35–40% width).
  - Bottom sheet diventa pannello laterale sticky.
- Desktop (≥ 1024px):
  - Spaziatura aumentata, pannello dettagli fisso.
  - Possibile zoom/pan (non necessario per MVP).

3) Interazioni minime lato utente
- Tap su postazione:
  - Seleziona quella postazione, evidenzia marker (bordo/alone), apre dettaglio:
    - ID/Nome (es. D05), Stato, ultima attività/aggiornamento.
    - Azione: Prenota (link a /booking/:deskId). Se “non disponibile” o “occupato”, disabilitare e mostrare hint.
- Refresh:
  - Pulsante in header. Mostra stato loading (spinner) e disabilita temporaneamente.
  - Opzionale: polling 15–30s con indicatorino “Aggiornato alle HH:MM”.
- Focus/Keyboard:
  - Marker focusable (tabIndex=0), attivabili con Enter/Space; aria‑label con “Postazione D05 – Occupato”.
- Errori:
  - Banner non intrusivo in header o toast.

4) Palette colori e codifica visiva
- Obiettivi: distinguibilità cromatica e testuale, contrasto con testo ≥ 4.5:1.
- Stati:
  - Libero: Verde 600 — #16a34a (bg), border #15803d, testo #ffffff.
  - Occupato: Rosso 600 — #dc2626 (bg), border #b91c1c, testo #ffffff.
  - Non disponibile: Grigio 500/600 — #6b7280 (bg), border #4b5563, testo #ffffff.
- Icone/shape ridondanti (per daltonismo):
  - Libero: icona ✓ o cerchio pieno ●
  - Occupato: icona ✕ o quadrato con X
  - Non disponibile: icona ⛔/lucchetto o pattern a tratteggio ▦
- Legenda: chip con icona + etichetta testuale.
- Token CSS suggeriti (custom properties):
  - --desk-free: #16a34a; --desk-free-border: #15803d; --desk-free-fore: #ffffff
  - --desk-busy: #dc2626; --desk-busy-border: #b91c1c; --desk-busy-fore: #ffffff
  - --desk-na: #6b7280; --desk-na-border: #4b5563; --desk-na-fore: #ffffff

5) Fallback per schermi molto piccoli
- Se width < 320px o height < 560px:
  - Ridurre padding, nascondere etichette sui marker (solo icone), mostrare label al focus.
  - Legenda collassabile (accordion) o accessibile via pulsante “Legenda”.
  - Se SVG non entra in verticale, offrire switch “Lista” che mostra 12 righe compatte:
    - [●] D01  [Prenota]
    - [✕] D02  [Prenota disab.]
    - …

6) Dati e aggiornamenti (indicazioni)
- Endpoints (indicativi): GET /api/desks -> [{ id, name, status }]
- Status: "free" | "busy" | "unavailable".
- Aggiornamento: manuale via Refresh; opzionale polling 15–30s con backoff.

7) Accessibilità (A11y)
- Touch target ≥ 44×44 px; spaziatura minima 8px tra marker adiacenti.
- Ruoli/ARIA: markers come <button role="button" aria‑label="Postazione D01 – Libero">.
- Focus ring visibile (outline ad alto contrasto, es. #1d4ed8).
- Testo sempre presente nel pannello dettagli; colori usati in modo ridondante con icone.

8) Composizione componenti (proposta tecnica)
- DashboardPage.tsx: orchestrazione, stato, fetch, layout header+map+legend.
- DeskMap.tsx: mappa SVG responsive con 12 DeskMarker posizionati (props: id, x%, y%, status, selected, onSelect).
- DeskLegend.tsx: chips stato con contatori.
- DeskDetailsSheet.tsx: bottom sheet (mobile) / side panel (tablet/desktop) con azioni.
- RefreshButton.tsx: bottone con spinner.
- Routing: pagina protetta dietro <ProtectedRoute> (vedi frontend/src/router/ProtectedRoute.tsx).

9) Posizionamento marker (esempio percentuale)
- Disposizione 3×4 (esempio schematico, da rifinire su mappa reale):
  - Riga 1: D01 (10,15), D02 (40,15), D03 (70,15)
  - Riga 2: D04 (10,40), D05 (40,40), D06 (70,40)
  - Riga 3: D07 (10,65), D08 (40,65), D09 (70,65)
  - Riga 4: D10 (10,85), D11 (40,85), D12 (70,85)

10) Stati visuali marker (CSS indicativo)
- Base: 32–40px, border‑radius: 8px/50% (variante), shadow leggera. Icona + label corta (es. D05) visibile su mobile≥360px.
- Selected: bordo 2px ad alto contrasto (es. #0ea5e9) + glow soft.
- Disabled (non disponibile): opacità 0.6 + pattern hatch (SVG pattern o background-image).

11) Microcopie
- Header: “Mappa postazioni”
- Pulsante: “Aggiorna” (tooltip/aria‑label), icona ↻
- Legend chip: “Libero”, “Occupato”, “Non disp.”
- Dettagli: “Ultimo aggiornamento alle HH:MM”
- Azione: “Prenota” (disabilitato se non Libero)

12) Metriche/telemetria (facoltativo)
- Tracciare tap su postazione, tempo refresh, conversione “Prenota”.

Appendice A — Note implementative rapide
- SVG responsive: usare viewBox e preserveAspectRatio="xMidYMid meet". Marker posizionati con percentuali (x,y) su width/height della viewBox.
- Bottom sheet: fixed, translateY, backdrop semitrasparente; chiusura con swipe‑down (MVP: bottone Chiudi).
- Test: snapshot base per layout, test RTL su interazioni (tap, legenda conteggi). 
- Stili: inizialmente inline (pattern simile a AuthPage) o CSS module; introdurre design tokens (CSS vars) per palette.
