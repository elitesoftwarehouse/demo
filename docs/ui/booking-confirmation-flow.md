Flusso UI — Selezione postazione e popup di conferma prenotazione
Versione: 1.0 — 2026-01-17
Stato: proposta pronta per sviluppo frontend

Obiettivo
- Quando l’utente tocca/clicca una postazione LIBERA sulla mappa, aprire un popup di conferma con i dati minimi (data, postazione) e due azioni: Conferma e Annulla.
- Se la postazione non è libera, non aprire il popup (comportamento neutro). In caso di necessità future, prevedere un messaggio non bloccante.

Ambito
- Dashboard mappa 12 postazioni (mobile‑first). Componente di conferma implementato come bottom sheet (mobile) con overlay; su schermi ampi può diventare modale centrata o pannello laterale coerente con le linee guida del portale.

Evento di selezione
- Trigger: single tap/click sul nodo postazione con stato "Libero".
- Disabilitazione: i nodi "Occupato" o "Non disponibile" non reagiscono al click (aria-disabled, cursor: not-allowed).

Dati nel popup di conferma
- Data di prenotazione: data corrente di sistema oppure, se la pagina dispone di una data già selezionata nel contesto, usare quella.
- Postazione: codice (es. S07) ed eventualmente nome descrittivo, se disponibile.
- (Futuri campi opzionali) Building / Floor se già disponibili nel contesto.

Testi popup (IT)
- Titolo: "Confermi prenotazione?"
- Messaggio: "Stai prenotando la postazione {Sxx} per il giorno {dd/mm/yyyy}."
- Pulsanti: "Conferma" (primario), "Annulla" (secondario).

Comportamento pulsanti
- Conferma: invia richiesta di creazione prenotazione. In questa fase, se l’endpoint non è ancora disponibile, simulare con uno stub lato frontend. Alla risposta positiva: chiudere il popup e mostrare feedback (toast/snackbar). Alla risposta di errore: mostrare messaggio nel popup e lasciare i pulsanti abilitati al retry.
- Annulla: chiude il popup senza effetti.

Comportamento per postazioni non libere
- Nessun popup. Il click è disabilitato; il focus è permesso per accessibilità ma l’attivazione non produce azione. In alternativa, in una evoluzione, si potrà mostrare un hint "Postazione non disponibile".

Accessibilità
- Il bottone della postazione include aria-label con stato.
- Il popup è role="dialog" con aria-modal="true", focus iniziale sul titolo o sul pulsante primario.
- Tasti Esc per chiudere (non obbligatorio in questa prima versione mobile).

Wireframe (mobile, bottom sheet)

+---------------- Overlay (semi-trasparente) ---------------+
|                                                          |
|   +-----------------------------------------------+      |
|   |  ▢  Confermi prenotazione?                    |      |
|   |-----------------------------------------------|      |
|   |  Stai prenotando la postazione S07            |      |
|   |  per il giorno 18/01/2026.                    |      |
|   |                                               |      |
|   |  [Annulla]         [Conferma]                 |      |
|   +-----------------------------------------------+      |
|                                                          |
+----------------------------------------------------------+

Stati e gestione errori
- Idle: pulsanti attivi.
- Loading: pulsante "Conferma" in stato di caricamento/disabled; testo "Conferma" → "Conferma…".
- Error: messaggio breve rosso nel popup sopra i pulsanti (es. "Errore temporaneo, riprova").

Note implementative
- Il componente di conferma viene inserito in frontend/src/features/dashboard/components come ConfirmBookingModal.tsx e riutilizza lo stile bottom-sheet già presente.
- L’apertura è condizionata dallo stato "available" della postazione.
- La data mostrata è new Date() (corrente) o una data dal contesto se disponibile.
- Integrare successivamente la chiamata reale all’endpoint di prenotazione (es. POST /bookings) e la gestione delle risposte.

Definizione evento e contratto (frontend)
- onSelect(id: string): se la postazione con id ha status "available", apri ConfirmBookingModal con { stationId: id, date }. Altrimenti non fare nulla.
- onConfirm(): chiama bookingService.createBooking({ stationId, dateISO }). Alla risposta ok → chiudi e mostra feedback; errore → mostra messaggio.

Allineamento con linee guida UI
- Stili coerenti con i pulsanti .btn e bottom-sheet definiti in assets/styles/dashboard.css.
- Testi brevi, tasti grandi (>=44px), contrasto AA.

Output per sviluppo
- Nuovo componente ConfirmBookingModal.tsx.
- Aggiornamento StationNode (disabilita click se non available).
- Aggiornamento DashboardPage per orchestrare il flusso (selezione → popup → conferma/annulla).
