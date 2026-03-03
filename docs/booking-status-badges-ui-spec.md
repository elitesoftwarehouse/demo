# Badge Stati Prenotazione — Specifiche UI/UX e Mapping

Versione: 0.2 (Draft)
Data: 17/01/2026
Autore: Frontend/UX Team
Stato: Da validare con PO/Dev

Obiettivo
- Definire mapping chiaro tra gli stati di prenotazione lato dominio/backend e le etichette/visualizzazioni lato UI.
- Fornire linee guida per i badge (chip/pill) da mostrare nella pagina "Le mie prenotazioni" e componenti correlati.
- Stabilire comportamento di fallback per stati futuri/sconosciuti e note per i18n.

Riferimenti
- Modello backend (enum): BookingState = { PASSATA, ATTIVA, CANCELLATA }
- UI attuale (temp): MyBookingsPage rende badge per PENDING/CONFIRMED/CANCELLED (stub) — verrà allineato a BookingState.
- Documenti collegati: docs/my-bookings-data-and-api-spec.md

1) Mapping stato dominio → etichetta utente
- PASSATA → "Passata"
- ATTIVA → "Attiva"
- CANCELLATA → "Cancellata"

Regole di precedenza (se servisse logica derivata):
- Se stato=CANCELLATA → mostra sempre "Cancellata" (indipendentemente dalla data).
- Altrimenti, se stato=PASSATA → mostra "Passata".
- Altrimenti (ATTIVA) → mostra "Attiva".

Compat temporaneo (fino ad allineamento API di lettura):
- CONFIRMED → Attiva
- PENDING → Attiva (oppure etichetta separata "In attesa" con colore giallo solo se richiesto dal PO)
- CANCELLED → Cancellata

2) Linee guida UI/UX — Badge (pill)
- Forma: pill (border‑radius: 999px) con testo breve.
- Dimensioni (tabellare S, default per MyBookingsPage):
  - Altezza: 20–22px
  - Font size: 12px, font‑weight: 600
  - Padding: 2px 8px
- Posizione in tabella: ultima colonna "Stato" nella riga; allineamento a sinistra; verticalmente centrato.
- Posizione in card: in alto a destra dentro la card (corner) o sotto il titolo/postazione, prima dei metadati. Margine top 4–6px, allineamento a destra.
- Icone (facoltative, 12–14px, aria-hidden="true"):
  - Attiva: ✓ (check) o cerchio con check
  - Passata: 🕓 (clock) o freccia indietro
  - Cancellata: ✕ (x) o ⛔ (no-entry)
- Accessibilità/contrasto: rapporto minimo 4.5:1 su testo/foreground.

Palette consigliata (in linea con stile corrente — grigi, rosso, verde):
- ATTIVA (positivo)
  - bg: #10B981 (emerald-500)
  - fg: #FFFFFF
  - border: 1px solid #059669 (emerald-600) opzionale per contrasto su sfondi chiari
- PASSATA (neutro)
  - bg: #E5E7EB (gray-200) oppure #9CA3AF (gray-400) se si preferisce pieno
  - fg: #111827 (gray-900) se bg chiaro, altrimenti #FFFFFF su bg più scuro
  - border: 1px solid #D1D5DB (gray-300) per versione bg chiaro
- CANCELLATA (negativo)
  - bg: #DC2626 (red-600)
  - fg: #FFFFFF
  - border: 1px solid #B91C1C (red-700) opzionale

Stati hover/focus (se cliccabili in altri contesti):
- Focus visible: outline: 2px solid #2563EB (blue-600), outline-offset: 2px
- Non interattivi di default nella tabella (role="status" semantico; non button)

3) Fallback per stati futuri/non gestiti
- Badge "neutro" con etichetta derivata o generica.
  - Etichetta: se disponibilie una label i18n per la chiave sconosciuta, usarla; altrimenti "Sconosciuto".
  - bg: #F3F4F6 (gray-100)
  - fg: #111827 (gray-900)
  - border: 1px solid #E5E7EB (gray-200)
  - icona: ? (question) opzionale
- Log di warning in console/devtools (solo dev) per aiutare il QA ad intercettare stati nuovi.

4) i18n delle etichette
- Chiavi proposte:
  - booking.status.PASSATA = "Passata"
  - booking.status.ATTIVA = "Attiva"
  - booking.status.CANCELLATA = "Cancellata"
  - booking.status.UNKNOWN = "Sconosciuto"
- Icone opzionali con chiavi dedicate se necessario (es. booking.status.icon.ATTIVA)
- Default locale: it-IT; struttura estensibile per en-US in futuro.

5) Schema riassuntivo (per approvazione)

| Backend (BookingState) | Etichetta (it) | Colore bg | Colore fg | Border              | Icona | Note accessibilità |
|------------------------|----------------|-----------|-----------|---------------------|-------|--------------------|
| ATTIVA                 | Attiva         | #10B981   | #FFFFFF   | #059669 opzionale   | ✓     | AA 4.5:1 ok        |
| PASSATA                | Passata        | #E5E7EB   | #111827   | #D1D5DB             | 🕓    | AA 4.5:1 ok        |
| CANCELLATA             | Cancellata     | #DC2626   | #FFFFFF   | #B91C1C opzionale   | ✕     | AA 4.5:1 ok        |
| (fallback)             | Sconosciuto    | #F3F4F6   | #111827   | #E5E7EB             | ?     | AA 4.5:1 ok        |

6) Note implementative (frontend)
- Creare un componente riutilizzabile <BookingStatusBadge status={...} locale="it-IT" /> che incapsula mapping e palette.
- MyBookingsPage: sostituire la logica inline attuale del badge con il componente condiviso.
- Mapping temporaneo per compat:
  - Se API/stub restituiscono CONFIRMED/PENDING/CANCELLED, mappare provvisoriamente a { ATTIVA, ATTIVA (o "In attesa" giallo), CANCELLATA } finché l’API non espone PASSATA/ATTIVA/CANCELLATA.
- Test visuali: verificare contrasto e resa su righe "passate" già dimmerate (il badge deve restare leggibile; preferire versione PASSATA con bg chiaro e testo scuro in quel contesto).
- Semantica ARIA: <span role="status" aria-label="Stato: Attiva">...badge...</span> per lettori di schermo, evitando ripetizioni.

Appendice — Pseudocodice mapping

function mapStatusToBadge(s) {
  switch (s) {
    case 'ATTIVA': return { label: t('booking.status.ATTIVA'), bg: '#10B981', fg: '#FFFFFF', icon: '✓' };
    case 'PASSATA': return { label: t('booking.status.PASSATA'), bg: '#E5E7EB', fg: '#111827', icon: '🕓' };
    case 'CANCELLATA': return { label: t('booking.status.CANCELLATA'), bg: '#DC2626', fg: '#FFFFFF', icon: '✕' };
    default: return { label: t('booking.status.UNKNOWN'), bg: '#F3F4F6', fg: '#111827', icon: '?' };
  }
}
