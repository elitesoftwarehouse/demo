Holidays blocking (frontend integration)

Goal
- Disabilitare nel datepicker le date restituite dall'endpoint /api/calendar/holidays.

Contract
- blockedDates: array di stringhe YYYY-MM-DD
- timezone: Europe/Rome (default)

UI/UX
- Le date disabilitate non sono cliccabili; su hover mostrare tooltip "Chiuso per festività".
- Aggiungere legenda e link alla policy orari.

Caching
- Cache per mese/anno nel client; invalidare al cambio baseUrl o lingua.

Accessibility
- aria-disabled sui giorni bloccati; testo per SR: "giorno non prenotabile: festività".

Testing
- Mockare l'API per un mese campione e verificare che le domeniche e una lista di blockedDates siano disabilitate.
