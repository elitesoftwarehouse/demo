# Requisiti Blocco Date: Festività Italiane e Domeniche

Versione: 1.0
Data: 17/01/2026
Autore: Product/Backend/Frontend Team
Stato: Draft (da validare con Operations)

---

1) Scopo
- Definire in modo chiaro l’insieme di giorni in cui il coworking è chiuso e la selezione data deve essere automaticamente bloccata nei flussi di prenotazione.
- Allineare front‑end e back‑end su regole, fonte di verità e configurabilità.

2) Ambito di applicazione
- Il blocco deve essere applicato in TUTTI i moduli/flussi che prevedono la scelta di una data di prenotazione (mappa postazioni, eventuale lista, modifiche prenotazione).
- La regola deve essere applicata sia lato UI (disabilitazione nel date‑picker) sia lato API (validazione server) per evitare prenotazioni invalide via chiamate dirette.
- Timezone di riferimento: Europe/Rome.

3) Giorni da bloccare
A. Domeniche
- Tutte le domeniche dell’anno, senza eccezioni.

B. Pasquetta (Lunedì dell’Angelo) – data mobile
- Il lunedì successivo alla Pasqua (data calcolata annualmente con algoritmo gregoriano).
- Implementazione: calcolo della data di Pasqua per l’anno Y, quindi Pasquetta = Pasqua + 1 giorno.

C. Festività italiane fisse (chiusura standard)
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

Note:
- Se una festività fissa cade di domenica, è già bloccata dalla regola “Domeniche”. Non servono duplicazioni.
- Il sabato NON è considerato festivo di default: resta prenotabile salvo diverse indicazioni operative.

D. Festività/chiusure locali (parametrizzabili)
- Esempi: Santo Patrono, chiusure straordinarie (es. 24/12, 31/12, ponte di Ferragosto), eventi interni.
- Devono essere gestite via configurazione per consentire aggiornamenti senza deploy.

4) Fonte di verità e configurabilità
Approccio a livelli (fallback):
1. Lista di base “immutabile” nel codice per le festività fisse nazionali + calcolo Pasquetta.
2. Configurazione applicativa per aggiunte/override (chiusure locali, straordinarie):
   - Opzione A: Tabella DB holidays (preferita in produzione)
     - campi suggeriti: id, date (DATE), name, is_recurring (boolean), day (int), month (int) per ricorrenze, enabled (boolean), notes.
     - Semantica: se is_recurring=true → applicare ogni anno su day/month; altrimenti usare il campo date specifico.
   - Opzione B: File di configurazione (JSON/YAML) caricabile all’avvio come fallback in ambienti senza DB.
   - Opzione C: Feature flag per abilitare/disabilitare rapidamente specifiche date (solo in supporto ad A/B operativi).
3. Policy di merge: la configurazione esterna si unisce alla base e può aggiungere nuove date; in caso di conflitto sulla stessa data, prevale la configurazione esterna.

5) Range temporale e performance
- Range di interesse: anno corrente e prossimo anno (Y e Y+1).
- La UI deve pre‑calcolare e mantenere in cache locale l’elenco di date bloccate per Y e Y+1 per una UX fluida.
- Il backend deve esporre un endpoint (in futuro) che restituisce le date bloccate per un anno richiesto, includendo:
  - domeniche
  - festività fisse
  - Pasquetta calcolata
  - festività/chiusure locali da configurazione
- Aggiornamenti di configurazione: invalidare la cache lato UI al cambio versione/config (es. via ETag o versionamento response).

6) Regole di validazione (contract)
- UI: il date‑picker deve disabilitare tutte le date restituite dal servizio e le domeniche locali calcolate.
- API: rifiutare (422/400) richieste di prenotazione su date bloccate anche se la UI non ha applicato correttamente la regola (difesa in profondità).
- Messaggistica utente: mostrare un messaggio uniforme, es. “Il coworking è chiuso per festività in questa data”. Se disponibile, includere il nome della festività.

7) Dettagli implementativi suggeriti (sintesi)
- Funzioni core:
  - isSunday(date, tz='Europe/Rome')
  - getFixedHolidays(year): insieme di yyyy-mm-dd per le festività fisse nazionali
  - getEasterMonday(year): calcolo algoritmo gregoriano → (Pasqua + 1 giorno)
  - getLocalClosures(year): da DB/config (sia ricorrenti che specifiche)
  - getBlockedDates(year): unione di A+B+C+D
  - isBlocked(date): appartenenza a getBlockedDates(date.year) OR isSunday(date)
- Attenzione ai fusi orari: le date devono essere trattate come “giorni civili” in Europe/Rome; evitare conversioni UTC che cambiano il giorno.

8) Esempi
- Per l’anno 2026, oltre alle domeniche, saranno bloccate: 2026-01-01, 2026-01-06, 2026-04-25, 2026-05-01, 2026-06-02, 2026-08-15, 2026-11-01, 2026-12-08, 2026-12-25, 2026-12-26, e Pasquetta (data mobile). Idem per 2025.

9) Governance e manutenzione
- Ownership: Operations definisce le chiusure locali; il Product le approva; il Team Backend aggiorna la configurazione su ambienti; il Frontend recepisce via API.
- SLA aggiornamenti: entro 2 giorni lavorativi dalla richiesta di nuova chiusura.
- Audit: mantenere storico modifiche (chi, quando, cosa) per trasparenza.

10) Criteri di accettazione
- [ ] Le domeniche risultano sempre disabilitate in UI e rifiutate a livello API.
- [ ] La lista delle festività fisse è correttamente disabilitata per Y e Y+1.
- [ ] Pasquetta è calcolata correttamente per Y e Y+1.
- [ ] È possibile aggiungere almeno una chiusura locale via configurazione senza deploy.
- [ ] Il blocco è coerente in tutti i flussi di prenotazione.
