# Flusso UI/UX: Selezione Postazione e Popup Conferma Prenotazione

Versione: 1.0
Data: 17/01/2026
Autore: Frontend Team
Stato: Proposta condivisa (per validazione UX)

---

Obiettivo
- Consentire all’utente di selezionare una postazione libera dalla mappa e confermare consapevolmente la prenotazione tramite popup.

Ambito
- Dashboard mappa postazioni (12 postazioni), mobile-first con griglia responsiva.
- Non copre il flusso completo di pagamento o selezione slot orari (out of scope).

Contesto attuale
- Frontend possiede la pagina DashboardPostazioni con polling dello stato postazioni da API.
- Stati: FREE, OCCUPIED, UNAVAILABLE.
- Esiste BookingPage con selettore data e disabled dates; tuttavia la dashboard non ha ancora un contesto data condiviso.

Principi UX
- Tap/click solo su elementi “FREE” apre il popup di conferma; gli altri stati risultano non interattivi (cursor not-allowed, aria-disabled) e non aprono popup.
- Modal a schermo intero attenuato (overlay) con focus management ed escape per chiusura.
- Chiarezza e brevità nei testi; data formattata in italiano; evidenza del nome/numero postazione.

Dati minimi nel popup
- Data di prenotazione: data corrente (o data selezionata in un contesto superiore quando disponibile).
- Postazione: nome leggibile (es. “Postazione 7”) ed eventuale ID numerico.
- Opzionale futuro: building/floor se presenti nel modello.

Testi del popup
- Titolo: “Confermare prenotazione?”
- Messaggio: “Stai per prenotare la seguente postazione:”
- Attributi: Data: <data in it-IT> — Postazione: <nome> (#<id>)
- Nota: "Verifica le informazioni prima di confermare. Potrai modificare o annullare la prenotazione secondo le policy del coworking."
- Pulsanti: “Annulla” (secondary), “Conferma” (primary)

Comportamenti
- Tap su postazione FREE: apre popup.
- Tap su postazione OCCUPIED/UNAVAILABLE: nessuna azione. Il componente mostra solo stato e disabilita l’interazione.
- “Annulla”: chiude il popup e mantiene la selezione evidenziata nel pannello informativo.
- “Conferma”: invia azione di prenotazione.
  - Implementazione attuale: callback onPrenota(station) o fallback a alert("Azione prenotazione …").
  - Integrazione futura: chiamata API POST /api/bookings con payload { date, stationId } e gestione esiti (success/error) con toast e aggiornamento stato.

Accessibilità
- Focus trapping leggero: all’apertura del modal il focus si sposta sul dialog; ESC chiude la modale.
- Role="dialog", aria-modal=true, aria-labelledby per titolo.
- Etichette ARIA su card delle postazioni e tooltip title con stato.

Wireframe (testuale)
- Griglia 3x4 (mobile), 4x3 (>=768px). Card colorate per stato con icona (● libero, ■ occupato, × non disponibile).
- Selezione: card FREE tappata -> overlay scuro + box centrale con titolo + lista dati + due bottoni.

Stati di errore
- Errori networking sul fetch stato postazioni: banner inline con pulsante “Riprova”.
- Errori prenotazione (futuro): messaggio nel modal o toast, senza chiusura automatica.

Linea guida con UX/UI
- Il layout, palette e spaziature seguono la UI minimale già presente.
- Integrazione futura con design system aziendale: sostituire il modal con componente standard (es. MUI/Design System interno) mantenendo comportamenti definiti.

Note implementative
- DashboardPostazioni accetta bookingDate opzionale per mostrare la data nel popup (default: oggi).
- ConfirmBookingModal è un componente indipendente, senza dipendenze esterne, con gestione focus/ESC.
- Il click su postazioni non libere è disabilitato (disabled + cursor not-allowed) per evitare confusione.
