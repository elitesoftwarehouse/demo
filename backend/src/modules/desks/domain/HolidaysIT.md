SmartDesk – Festività Italiane da bloccare (Sintesi per il team)

Scope
- Questo documento elenca le festività italiane e le regole applicate dal selettore data per impedire prenotazioni nei giorni di chiusura del coworking.

Regole generali
- Blocco domeniche (tutte le domeniche dell’anno)
- Blocco Pasquetta (lunedì successivo alla Pasqua, calcolata annualmente)
- Blocco festività nazionali a data fissa:
  • 01/01 Capodanno
  • 06/01 Epifania
  • 25/04 Festa della Liberazione
  • 01/05 Festa del Lavoro
  • 02/06 Festa della Repubblica
  • 15/08 Ferragosto
  • 01/11 Ognissanti
  • 08/12 Immacolata Concezione
  • 25/12 Natale
  • 26/12 Santo Stefano
- Facoltativo: festività locali o chiusure straordinarie definite da configurazione.

Parametrizzazione
- Festività nazionali e domeniche: sempre attive (non disabilitabili), salvo feature flag d’emergenza allowOpenOnNationalHoliday=false di default.
- Estensioni configurabili:
  - extraClosedDates: elenco YYYY-MM-DD aggiuntive (chiusure locali/straordinarie)
  - exceptionalOpenDates: elenco YYYY-MM-DD (aperture in deroga) che annullano il blocco per quel giorno

Range temporale
- Copertura: anno corrente + anno successivo (rolling). Le date fuori da questo range possono essere calcolate on-demand o non supportate.

Ambito di applicazione
- Tutti i flussi di prenotazione (desk, sale riunioni, risorse). La logica sarà centralizzata in un servizio condiviso e applicata sia lato front-end (UI datepicker) sia lato back-end (validazione API).

Note implementative
- Le date sono valutate in timezone Europe/Rome e rappresentate come YYYY-MM-DD.
- Pasquetta è calcolata con algoritmo gregoriano per la Pasqua e poi +1 giorno.
- In caso di sovrapposizioni (es. festivo che cade di domenica) si evita il duplicato; exceptionalOpenDates prevale e rende prenotabile.

Prossimi passi
- Implementare servizio HolidaysService con API:
  - getClosedDates(year)
  - isDateClosed(date)
  - listClosedDates(rangeStart, rangeEnd)
- Introdurre un file di esempio di configurazione e mappare eventuale tabella DB per gestione da backoffice.
