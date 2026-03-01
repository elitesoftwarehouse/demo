# Dashboard con mappa delle 12 postazioni — Mobile-first

Stato: proposta UI/UX (low-fidelity wireframe) — v1.1
Autore: Team UX/Frontend
Obiettivo: definire struttura e comportamento della dashboard per visualizzare e interagire con la mappa delle 12 postazioni, ottimizzata per mobile.


## 1) Layout principale

Elementi chiave:
- Header: titolo schermata, azioni globali (refresh), eventuale accesso al menu/profilo.
- Area mappa: griglia di 12 nodi (postazioni) interattivi. Rappresentazione semplice con forme e colori di stato.
- Legenda / status bar: codifica colori (Libero, Occupato, Non disponibile) + timestamp "Ultimo aggiornamento".
- Pulsante di refresh: azione primaria per ricaricare stato (come icona nell'header; opzionalmente FAB su mobile).
- Pannello dettagli (mobile: bottom sheet / drawer) quando si seleziona una postazione.
- Popup di conferma prenotazione: bottom sheet modale che appare quando si tocca una postazione LIBERA.

Gerarchia visiva (mobile-first):
- Header sticky
- Mappa con aspect ratio stabile (ad es. 1:1) per evitare jump layout
- Legenda compatta subito sotto la mappa
- Pannello dettagli sovrapposto quando aperto


## 2) Wireframe (low-fidelity)

Mobile (portrait ~360–420px)

+--------------------------------------------------+
|  Header                                          |
|  <  Mappa postazioni             ⟳  (Refresh)    |
+--------------------------------------------------+
|                                                  |
|  [S01] [S02] [S03]                               |
|  [S04] [S05] [S06]         (griglia 3 x 4)       |
|  [S07] [S08] [S09]                               |
|  [S10] [S11] [S12]                               |
|                                                  |
+--------------------------------------------------+
|  Legenda: ● Libero  ● Occupato  ● Non disp.   12:35|
+--------------------------------------------------+
|  Bottom sheet — Dettagli (opzionale)              |
+--------------------------------------------------+

Popup conferma (bottom sheet modale)
+--------------------------------------------------+
|  ▢  Confermi prenotazione?                        |
|  Stai prenotando la postazione S07 per il giorno  |
|  18/01/2026.                                      |
|                                                   |
|  [Annulla]                  [Conferma]            |
+--------------------------------------------------+


## 3) Interazioni
- Tap/click su postazione LIBERA → apre popup di conferma con data e codice postazione.
- Tap/click su postazione non libera → nessuna azione (disabilitato). In una successiva iterazione, si potrà aggiungere un hint.
- Azioni nel popup: Conferma (invio richiesta), Annulla (chiusura popup).
- Pannello dettagli: attivabile dalla selezione o altre azioni; quando il popup è aperto, il pannello dettagli resta nascosto.

## 4) Testi e accessibilità
- Titolo: "Confermi prenotazione?"; messaggio: "Stai prenotando la postazione {Sxx} per il giorno {dd/mm/yyyy}."
- Pulsanti: "Annulla" (secondario), "Conferma" (primario).
- role="dialog", aria-modal="true", focus management; overlay cliccabile per chiudere.

## 5) Comportamento tecnico
- Lo stato di disponibilità decide se aprire il popup.
- La data mostrata è quella corrente, oppure la data selezionata nel contesto (es. dal DatePicker).
- Submit asincrono con stato loading e gestione errori. La chiamata reale al backend verrà integrata quando pronto l'endpoint.

Riferimenti
- Specifica completa del flusso di conferma: ./booking-confirmation-flow.md
