Specifica UI/UX — Dashboard mappa 12 postazioni (mobile-first)
Versione: 1.0 — 2026-01-17

1. Obiettivo
- Visualizzare 12 postazioni in una mappa interattiva, con codifica visiva per 3 stati: Libero, Occupato, Non disponibile.
- Garantire usabilità su mobile (target primario) e adattamento su tablet/desktop.

2. Layout
- Header sticky con titolo e pulsante refresh.
- Area mappa a griglia responsive (3x4 mobile, 4x3 tablet, 6x2 desktop).
- Legenda con indicatori stati e timestamp ultimo aggiornamento.
- Pannello dettagli: bottom sheet su mobile; laterale persistente su schermi ampi.

3. Interazioni
- Tap/click su postazione → apre dettagli con nome, stato e azioni.
- Azioni: Prenota (link /booking?station=Sxx) e Dettagli (link a pagina dedicata, se presente).
- Refresh manuale tramite icona; pull-to-refresh opzionale (non incluso in questa versione).
- Accessibilità: focus, attivazione con Enter/Space, aria-label su nodi e controlli.

4. Palette e codifica
- Libero: #16A34A (Green 600) — icona ✓, testo bianco.
- Occupato: #F59E0B (Amber 500) — icona ⏳/👤, testo bianco.
- Non disponibile: #6B7280 (Gray 500) — icona ⛔/—, testo bianco.
- Contrast check WCAG AA per testo/icone; legenda con testo esplicito.

5. Responsive
- Breakpoints: <360px lista; 360–767 mobile grid 3x4; 768–1023 tablet grid 4x3 + pannello laterale; ≥1024 desktop grid 6x2 o 4x3 con maggior spaziatura.
- Touch target >=44x44px.

6. Fallback molto piccoli schermi
- Vista lista compatta con ordinamento Libere → Occupate → Non disp.; pulsante "Apri" per dettagli.

7. Dati minimi e API (placeholder)
- Station: { id: 'S01', name?: string, status: 'available'|'busy'|'unavailable', updatedAt?: ISO }
- Endpoint in futuro: GET /stations (lista), GET /stations/:id, WS per aggiornamenti in tempo reale (non incluso ora).

8. KPI e metriche UX (facoltativo)
- Tempo alla comprensione dello stato (<=2s), tasso di tap su prenotazione, bounce del pannello dettagli.

9. Note implementative
- Usare CSS Grid, componenti React leggeri, nessuna dipendenza UI obbligatoria.
- Evitare animazioni invasive; transizioni su fill/border 150–200ms.
