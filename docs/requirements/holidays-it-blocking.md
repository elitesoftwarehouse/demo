Specifica sintetica — Blocco selezione date per festività italiane e domeniche
Versione: 1.0 — 2026-01-17
Autore: Team Prodotto/Tech

1) Obiettivo
- Impedire la selezione/prenotazione nelle giornate in cui il coworking è chiuso.
- Coprire automaticamente: tutte le domeniche, Pasquetta (lunedì dell’Angelo, data mobile) e le principali festività nazionali italiane.
- Prevedere anche festività/locali/chiusure straordinarie configurabili.

2) Ambito e applicazione
- Ambito frontend: disabilitare i giorni bloccati nel selettore data e mostrare un messaggio esplicativo.
- Ambito backend: validare lato server (hard rule) che non si possa creare/modificare una prenotazione in un giorno bloccato.
- Moduli interessati: tutti i flussi di prenotazione (es. mappa postazioni, eventuali API pubbliche/integrazioni). La regola è centralizzata e condivisa.

3) Elenco festività nazionali da bloccare (fisse)
- 01/01 — Capodanno
- 06/01 — Epifania
- 25/04 — Anniversario della Liberazione
- 01/05 — Festa del Lavoro
- 02/06 — Festa della Repubblica
- 15/08 — Assunzione di Maria (Ferragosto)
- 01/11 — Ognissanti
- 08/12 — Immacolata Concezione
- 25/12 — Natale
- 26/12 — Santo Stefano
Note:
- Le domeniche sono sempre bloccate; la Pasqua (domenica) rientra già nel blocco domenicale.
- Altre ricorrenze non nazionali (es. patrono cittadino) rientrano nella sezione 5 (configurabili).

4) Festività mobili — Pasquetta (lunedì dell’Angelo)
- Definizione: il giorno successivo alla Pasqua (domenica di Pasqua).
- Blocco: il lunedì di Pasquetta è SEMPRE bloccato.
- Calcolo: usare un algoritmo per la data di Pasqua del calendario gregoriano (es. algoritmo di Meeus o Anonymous Gregorian algorithm). Implementazione prevista lato backend (fonte autorevole) con eventuale utilità lato frontend per l’esperienza utente.

5) Festività/chiusure locali e straordinarie (configurabili)
- Esempi: patrono cittadino (p.es. Milano 07/12; Roma 29/06), chiusure aziendali, ponti, manutenzioni programmate.
- Modalità: elenco configurabile e sovrascrivibile senza deploy, con due categorie:
  a) Ricorrenti (giorno/mese fissi, ogni anno)
  b) Puntuali (data specifica AAAA-MM-GG)
- Ogni voce ha: id, data o giorno/mese, nome, tipo (recurring|one-off), fonte (config/DB), attivo (bool), note opzionali.

6) Strategia di configurazione
- Approccio ibrido consigliato:
  a) Lista nazionale hardcoded (segnaposto in codice) per immediatezza e stabilità.
  b) Estensioni via configurazione centralizzata:
     - Fase 1: file di config (JSON/YAML) caricato all’avvio backend.
     - Fase 2: tabella DB holidays per gestione da backoffice (vedi docfunzionale sez. 4: Holidays).
- Feature flag: HOLIDAYS_STRICT_MODE (default true). Se false, il backend emette solo warning ma non blocca (utile in ambienti demo).

7) Finestra temporale (range di interesse)
- Calcolo/precaricamento per: anno corrente e anno successivo (rolling window, es. se oggi è 2026-11, coprire 2026 e 2027).
- Motivazione: i calendari di prenotazione difficilmente oltrepassano 12–18 mesi.
- Pulizia/refresh: rigenerare l’elenco mobile (Pasqua/Pasquetta) all’inizio di ogni anno o al cambio di finestra.

8) Regole di blocco (business rules)
- Sunday rule: tutti i giorni con weekday = 0 (domenica) non sono prenotabili.
- Fixed holidays: le date elencate in (3) sono non prenotabili ogni anno.
- Mobile holiday: Pasquetta (lunedì successivo alla Pasqua) non prenotabile.
- Local/extra: tutte le voci configurate attive in (5) bloccano la selezione.
- Precedenze:
  1) Eccezioni “override_open” (eventuale futura estensione) possono riaprire una data altrimenti bloccata.
  2) In assenza di override, qualsiasi regola di blocco rende la data non prenotabile.

9) Messaggistica UX
- Tooltip/label nel datepicker: “Chiuso per festività”.
- Messaggio pagina mappa: “Il coworking è chiuso in questa data per festività.”
- API error (HTTP 409 o 422): code=HOLIDAY_CLOSED, message="Date not bookable: holiday or Sunday"; includere la data e la regola che ha causato il blocco.

10) Verifiche e test
- Test unit: calcolo Pasqua/Pasquetta per un set di anni (campioni noti), mapping domeniche, match delle date fisse.
- Test integrazione: endpoint prenotazioni rifiuta date bloccate; date limite (31/12, 01/01) e cambi di anno.
- Test UX: il datepicker disabilita in modo coerente; messaggi localizzati IT.

11) Considerazioni tecniche di implementazione (linee guida)
- Backend
  - Service Holidays (es. core/calendar/HolidaysService) con API:
    - isClosed(date: LocalDate): boolean | { closed: boolean; reason: string; code: string }
    - listClosedDates(year: number): Array<{ date: string; code: string; name: string }>
  - Cache in memoria per finestra anno corrente + successivo.
  - Sorgenti: hardcoded nazionali + config (file/DB) per locali/extra.
- Frontend
  - Utilità isClosed(date) per il solo feedback UI. La decisione finale è del backend.
  - Datepicker: disabilitare domeniche e le date restituite da /calendar/closed?year=YYYY (endpoint da esporre in seguito).

12) Riepilogo decisioni
- Festività da bloccare: domeniche, Pasquetta, principali nazionali (lista al punto 3) + locali/extra configurabili.
- Configurabilità: nazionale hardcoded; locali/extra da config (file → DB). Feature flag HOLIDAYS_STRICT_MODE.
- Range temporale: anno corrente + prossimo (rolling window).
- Applicazione: tutti i moduli di prenotazione; validazione lato backend obbligatoria, UI di supporto lato frontend.

Appendice A — Esempio struttura config (fase 1, file JSON)
{
  "localHolidays": [
    { "id": "mi_s_ambrogio", "type": "recurring", "day": 7, "month": 12, "name": "Sant’Ambrogio (Milano)", "active": true },
    { "id": "rm_pietro_paolo_2026", "type": "one-off", "date": "2026-06-29", "name": "SS Pietro e Paolo (Roma)", "active": true }
  ]
}

Appendice B — Riferimenti
- Documenti: docs/docfunzionale.md (Gestione Festività), docs/ui/dashboard-spec.md
- Calcolo Pasqua (riferimento tecnico): Anonymous Gregorian algorithm / Meeus
