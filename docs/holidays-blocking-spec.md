# Selettore data — Blocco festività italiane e domeniche

Scopo
- Definire in modo univoco le date da disabilitare nel selettore data per prevenire prenotazioni nei giorni di chiusura del coworking.
- Fornire linee guida di configurazione e un contratto API per l’integrazione frontend/backend.

Ambito
- Si applica a tutti i flussi di prenotazione (postazioni, sale riunioni, day pass, ecc.).
- Possibili eccezioni per flussi specifici potranno essere definite via configurazione per modulo (out-of-scope per la prima iterazione).

Timezone e formato date
- Timezone: Europe/Rome (CET/CEST).
- Formato data per API/JSON: YYYY-MM-DD (ISO-8601, data-only al midnight locale).

Date da bloccare (baseline nazionale)
- Tutte le domeniche (ricorrenza settimanale).
- Lunedì dell’Angelo (Pasquetta) — data mobile calcolata come giorno successivo alla Pasqua.
- Festività nazionali ricorrenti a giorno fisso:
  - 01-01 Capodanno
  - 06-01 Epifania
  - 25-04 Festa della Liberazione
  - 01-05 Festa dei Lavoratori
  - 02-06 Festa della Repubblica
  - 15-08 Ferragosto
  - 01-11 Ognissanti
  - 08-12 Immacolata Concezione
  - 25-12 Natale
  - 26-12 Santo Stefano

Note ed edge case
- Se una festività ricade di domenica, la data resta comunque bloccata (non si rimuove il blocco).
- Ponti/chiusure straordinarie NON sono incluse nella baseline: sono gestite via configurazione (vedi sotto).
- Nel caso di aperture straordinarie (es. coworking aperto in un giorno festivo), si usa una lista di eccezioni per rendere selezionabile la data.

Configurabilità
- Parametrizzazione prevista tramite file di configurazione (o tabella DB in fasi successive):
  - fixedMMDD: array di stringhe "MM-DD" per festività ricorrenti nazionali/locali.
  - applySundays: boolean (default true) — abilita il blocco domenicale.
  - applyPasquetta: boolean (default true) — abilita il calcolo/blocco del Lunedì dell’Angelo.
  - localFixedMMDD: array opzionale di stringhe "MM-DD" per festività locali (es. Patrono), specifiche del coworking.
  - extraClosedDates: array opzionale di date puntuali "YYYY-MM-DD" per chiusure straordinarie.
  - exceptionOpenDates: array opzionale di date puntuali "YYYY-MM-DD" per aperture straordinarie (overrides: se presente, la data resta selezionabile anche se altrimenti bloccata).
  - timezone: string (default "Europe/Rome").
  - lookAheadMonths: numero di mesi di orizzonte rispetto a "oggi" per generare/precalcolare il calendario (default 18; valida anche la vista anno corrente + successivo).

Range temporale
- Default: anno corrente + prossimo (rolling). Alternativamente, lookAheadMonths = 18.
- Il backend deve accettare parametri year o range e validare i limiti (es. massimo 24 mesi).

Algoritmo (linee guida)
1) Determinare l’intervallo di generazione (es. dal primo giorno dell’anno corrente all’ultimo del prossimo, nel timezone configurato).
2) Calcolare tutte le domeniche nell’intervallo (se applySundays = true).
3) Per ogni anno nell’intervallo, materializzare le ricorrenze da fixedMMDD e localFixedMMDD in date YYYY-MM-DD.
4) Calcolare la data di Pasqua (algoritmo standard tipo Meeus/Jones/Butcher) e aggiungere il giorno successivo come Pasquetta (se applyPasquetta = true).
5) Unire extraClosedDates.
6) Sottrarre le exceptionOpenDates dal set risultante.
7) Deduplicare e ordinare.

Contratto API (proposta)
- Endpoint: GET /api/calendar/holidays
  - Query params:
    - year: intero (opzionale; se assente si usa l’intervallo di default anno corrente + prossimo)
    - from, to: YYYY-MM-DD (opzionali; se presenti definiscono un range esplicito, con guardrail massimo 24 mesi)
  - Response 200 (application/json):
    {
      "timezone": "Europe/Rome",
      "from": "2026-01-01",
      "to": "2027-12-31",
      "blockedDates": ["2026-01-01", "2026-01-06", "2026-03-29", "2026-04-06", ...],
      "source": {
        "applySundays": true,
        "applyPasquetta": true,
        "fixedMMDD": ["01-01", "06-01", "04-25", "05-01", "06-02", "08-15", "11-01", "12-08", "12-25", "12-26"],
        "localFixedMMDD": ["06-29"],
        "extraClosedDates": ["2026-12-31"],
        "exceptionOpenDates": ["2026-12-26"]
      }
    }

Frontend (integrazione)
- Il datepicker riceve blockedDates (YYYY-MM-DD) e disabilita la selezione dei giorni corrispondenti.
- UX: mostrare tooltip/label “Chiuso per festività” e legenda nel calendario.
- Accessibilità: usare attributi aria-disabled e messaggi comprensibili allo screen reader.

Caching e performance
- Backend: precalcolo e caching per anno (es. in-memory con TTL) per risposte veloci.
- Frontend: memoizzazione locale per mese/anno; invalidare cache al cambio di baseUrl o user locale.

Fonti dati e ownership
- Prima iterazione: file di configurazione deploy-driven (vedi esempio JSON).
- Iterazioni successive: tabella DB calendar_holidays con colonne (date, label, scope/modulo, is_open boolean per override), pannello admin per la gestione.

Validazione e QA
- Test funzionali su:
  - Domeniche: un mese campione deve risultare con 4/5 blocchi coerenti (timezone Europe/Rome).
  - Pasquetta: verificare calcolo per 3 anni consecutivi.
  - Fixed nazionali: presenza nell’anno corrente e successivo.
  - Locali/extra/exception: applichi correttamente override.
- Test e2e: verifica che non sia possibile completare la prenotazione con una data bloccata (server-side validation obbligatoria).

Riepilogo decisioni
- Festività baseline: elenco nazionale + Pasquetta + domeniche.
- Parametrizzazione: file JSON con ricorrenze/chiusure e override; in futuro DB.
- Range: anno corrente + prossimo (default) o lookAheadMonths=18, con guardrail max 24 mesi.
- Ambito: tutti i moduli di prenotazione.
- Timezone: Europe/Rome; formato date ISO YYYY-MM-DD.
