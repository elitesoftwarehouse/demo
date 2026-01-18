SmartDesk Coworking – Policy Festività e Date Bloccate

Obiettivo
- Definire l’elenco delle date in cui il coworking è chiuso e il selettore data deve impedire la prenotazione.
- Stabilire come gestire festività fisse, variabili (Pasquetta) e festività locali/straordinarie.
- Definire il range temporale di interesse e l’ambito di applicazione del blocco.

Ambito di applicazione
- Applicare il blocco su tutti i moduli di prenotazione (desk, sale riunioni, risorse/servizi) nella PWA e nelle API.
- Condividere un unico servizio/validator per calcolo e verifica delle date chiuse, così da garantire coerenza tra front-end e back-end.
- Timezone: Europe/Rome. Le date sono da considerare in calendario civile italiano (giorno intero, formato YYYY-MM-DD senza ora).

Elenco date da bloccare (baseline nazionale)
1) Tutte le domeniche (weekday = 0 nel calendario locale) – blocco sempre attivo.
2) Pasquetta (Lunedì dell’Angelo) – data mobile calcolata a partire dalla Pasqua (calendario gregoriano, rito romano). Regola: calcolare Pasqua N e fissare Pasquetta = Pasqua + 1 giorno.
3) Principali festività italiane a data fissa:
   - 01/01 – Capodanno
   - 06/01 – Epifania
   - 25/04 – Festa della Liberazione
   - 01/05 – Festa del Lavoro
   - 02/06 – Festa della Repubblica
   - 15/08 – Ferragosto
   - 01/11 – Ognissanti
   - 08/12 – Immacolata Concezione
   - 25/12 – Natale
   - 26/12 – Santo Stefano

Festività locali/chiusure straordinarie
- Possibilità di aggiungere date chiuse extra (es. patrono locale, ponte, chiusura straordinaria) via configurazione.
- Opzione per eccezioni “giorni aperti” su una festività (es. apertura straordinaria in un festivo), che sovrascrive il blocco.

Parametrizzazione/Configurazione
- Festività nazionali: abilitate per default e considerate sempre chiuse.
- Parametrizzabili da configurazione solo le “estensioni” (extraClosedDates) e le eccezioni (exceptionalOpenDates). Non è previsto disabilitare le festività nazionali a meno di specifico feature flag (allowOpenOnNationalHoliday) da tenere disattivo per default.
- Sorgente configurazione (ordine di risoluzione):
  1) File di config deploy-driven (es. JSON) – vedi holidays.config.example.json
  2) Variabile d’ambiente (override stringhe/array/flag)
  3) Tabella DB opzionale (es. closed_days) per gestione via backoffice; schema suggerito:
     - id (uuid), date (date), type (enum: NATIONAL/LOCAL/EXCEPTION), reason (text), enabled (boolean), created_at/updated_at
- Il servizio dovrà esporre un elenco di date chiuse normalizzato dopo aver applicato sovrapposizioni/override.

Range temporale
- Range operativo: anno corrente e anno successivo (rolling window di ~24 mesi). Questo copre la maggior parte delle prenotazioni future.
- Generazione: precomputare al bootstrap dell’app le date chiuse per currentYear e nextYear; per richieste oltre il range, calcolo on-demand o risposta “non supportata” (da definire in roadmap). Pasquetta viene calcolata via algoritmo di Pasqua gregoriana.

Deduplicazione e sovrapposizioni
- Se una festività cade di domenica, resta bloccato come festivo; il sistema evita duplicati nell’elenco.
- exceptionalOpenDates ha priorità alta e rimuove il blocco per quella data specifica.

Formato dati e contratti (linee guida)
- Rappresentazione date: stringa ISO corta (YYYY-MM-DD) in timezone Europe/Rome.
- Interfaccia di configurazione (indicativa):
  - fixedHolidaysEnabled: boolean (default true)
  - sundaysEnabled: boolean (default true)
  - allowOpenOnNationalHoliday: boolean (default false)
  - extraClosedDates: string[] // YYYY-MM-DD
  - exceptionalOpenDates: string[] // YYYY-MM-DD
  - locale: string | null // es. “mi-IT” per appunti locali (non vincolante)
- API/Servizio (indicative):
  - getClosedDates(year: number): string[]
  - isDateClosed(date: string | Date): boolean
  - listClosedDates(rangeStart: string, rangeEnd: string): string[]

Algoritmo per Pasqua/Pasquetta (nota di implementazione)
- Utilizzare algoritmo gregoriano (es. Anonymous Gregorian algorithm) per determinare la data di Pasqua di un anno.
- Calcolare Pasquetta come giorno successivo (Lunedì). Esempio (verifica manuale):
  - 2025: Pasqua 20/04/2025 → Pasquetta 21/04/2025
  - 2026: Pasqua 05/04/2026 → Pasquetta 06/04/2026

Criteri di accettazione
- Il selettore data non consente selezione di:
  - Domeniche
  - Pasquetta dell’anno corrente e del successivo
  - Festività nazionali elencate sopra
  - Date extra chiuse da configurazione
- Il selettore consente selezione su date festivi SOLO se presenti in exceptionalOpenDates.
- Coerenza tra PWA e API: la stessa data deve risultare chiusa in entrambi i canali.

Note operative
- Validazione lato server obbligatoria (anche se il front-end blocca la selezione) per prevenire prenotazioni non valide via API.
- I log non devono contenere dati personali; per le regole calendario, loggare solo date e motivazione della chiusura se utile al debug.
- Versionare la configurazione e documentare eventuali chiusure straordinarie nel changelog operativo.
