Specifiche UI — Badge stato prenotazione ("Le Mie Prenotazioni")
Versione: 1.0 — 2026-01-17

Obiettivo
- Fornire linee guida condivise per visualizzare uno stato sintetico della prenotazione tramite badge grafico.
- Coprire: mapping stato backend → etichetta utente, stile/posizionamento, fallback per stati futuri, supporto i18n.

Fonte dati e modello di stato
- Backend/DTO di riferimento: BookingDto (backend/modules/booking/dto/BookingDto.ts) con campo "state":
  - 'PASSATA' | 'ATTIVA' | 'CANCELLATA'
- Nota compatibilità: alcuni documenti legacy citano status 'PENDING'|'CONFIRMED'|'CANCELLED'|'COMPLETED'. In UI usiamo SEMPRE il campo normalizzato "state". Eventuali valori legacy, se presenti, non influenzano il badge.

1) Mapping stato → etichetta utente, colore, icona

| Valore backend (state) | Etichetta IT | Etichetta EN | Colore raccomandato | Icona suggerita | Semantica/Note |
| --- | --- | --- | --- | --- | --- |
| ATTIVA | Attiva | Active | Verde 600 (#16A34A) | ✓ (check) o • (dot) | Prenotazione valida per oggi o date future; evidenziare positivamente. |
| PASSATA | Passata | Past | Grigio 500 (#6B7280) | 🕓 (clock) | Prenotazione di una data precedente; stile attenuato. |
| CANCELLATA | Cancellata | Cancelled | Rosso 600 (#DC2626) | ✕ (cross) | Prenotazione annullata; segnale di stato negativo. |

Token CSS suggeriti (per coerenza con palette esistente in dashboard.css):
- Attiva: usa --color-available (#16A34A) se già definito; altrimenti definire --badge-attiva-bg: #16A34A.
- Passata: usa --color-unavailable (#6B7280) o definire --badge-passata-bg: #6B7280.
- Cancellata: definire --badge-cancellata-bg: #DC2626 (nuovo, non presente in dashboard.css).

2) Linee guida UX/UI per i badge
- Forma: pill (tag arrotondato) con border-radius pieno (9999px). Variante outline opzionale per stati neutri.
- Dimensioni:
  - Small (default nelle liste): altezza 22–24px, padding orizzontale 8–10px, font 12–13px semibold (500–600).
  - Medium (uso in card/dettaglio): altezza 28–30px, padding 10–12px, font 14px.
- Tipografia: testo con lettera iniziale maiuscola ("Attiva", "Passata", "Cancellata"). Evitare all-caps per leggibilità.
- Colori e contrasto:
  - Testo su sfondo colorato: bianco (#FFFFFF) con rapporto di contrasto ≥ 4.5:1 dove possibile.
  - Hover/focus: schiarire/scurire lo sfondo di ~8–12% e mostrare outline focus visibile (es. 2px #1D4ED8 a contrasto AA).
- Icona: opzionale, posizionata a sinistra del testo (4px di gap). Usare set nativo (emoji) o icone vettoriali del sistema.
- Posizionamento:
  - Riga tabellare: colonna dedicata a destra, testo allineato a destra per una singola linea; evitare wrapping.
  - Card: top-right sopra i metadati o inline vicino alla data; mantenere distanza minima 8–12px da altri elementi.
- Stato disabilitato/attenuato:
  - PASSATA: può usare opacità 0.9 o tonalità desaturata del grigio per non competere con ATTIVA.

3) Fallback per stati futuri/non gestiti
- In caso di valore non riconosciuto (es. nuovo stato introdotto senza supporto UI):
  - Etichetta IT: "Sconosciuta" — EN: "Unknown".
  - Stile: badge neutro outline (bordo grigio #9CA3AF, testo #374151, sfondo trasparente) o pieno grigio chiaro (#E5E7EB) con testo #111827.
  - Classe suggerita: .badge--neutral
  - Logica: non bloccare il rendering; mostrare comunque il badge neutro per mantenere coerenza visuale.

4) i18n delle etichette (linee guida)
- Non abbiamo ancora una libreria i18n nel frontend; per ora usare un dizionario minimale.
- API proposta per i componenti: badgeLabel(state: string, locale = 'it') → string
- Dizionario di esempio (TypeScript):

```ts
const BADGE_LABELS: Record<string, Record<'it'|'en', string>> = {
  ATTIVA: { it: 'Attiva', en: 'Active' },
  PASSATA: { it: 'Passata', en: 'Past' },
  CANCELLATA: { it: 'Cancellata', en: 'Cancelled' },
};

export function badgeLabel(state: string, locale: 'it'|'en' = 'it'): string {
  const map = BADGE_LABELS[state?.toUpperCase?.() || ''];
  if (map) return map[locale] || map.it;
  return locale === 'en' ? 'Unknown' : 'Sconosciuta';
}
```

5) Classi/CSS di riferimento (snippet)

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}
.badge--attiva { background: var(--badge-attiva-bg, #16A34A); color: #fff; }
.badge--passata { background: var(--badge-passata-bg, #6B7280); color: #fff; }
.badge--cancellata { background: var(--badge-cancellata-bg, #DC2626); color: #fff; }
.badge--neutral { background: transparent; color: #374151; border: 1px solid #9CA3AF; }
```

6) Esempio markup (tabellare o card)

```tsx
// state: 'ATTIVA' | 'PASSATA' | 'CANCELLATA' | altro
function BookingStateBadge({ state, locale = 'it' }: { state: string; locale?: 'it'|'en' }) {
  const s = (state || '').toUpperCase();
  const cls = s === 'ATTIVA' ? 'badge badge--attiva'
    : s === 'PASSATA' ? 'badge badge--passata'
    : s === 'CANCELLATA' ? 'badge badge--cancellata'
    : 'badge badge--neutral';
  const label = badgeLabel(s, locale);
  const icon = s === 'ATTIVA' ? '✓' : s === 'PASSATA' ? '🕓' : s === 'CANCELLATA' ? '✕' : '•';
  return <span className={cls} aria-label={`Stato prenotazione: ${label}`}><span aria-hidden>{icon}</span>{label}</span>;
}
```

7) Decisioni di accessibilità
- Il badge è decorativo ma comunica stato: fornire aria-label descrittivo ("Stato prenotazione: Attiva").
- Contrast ratio AA per testo su sfondo.
- Stato focus solo se il badge è interattivo (non previsto in questa iterazione).

8) QA checklist sintetica
- Rendering corretto dei 3 stati noti con etichetta IT.
- Fallback neutro per valore non riconosciuto.
- Verifica contrasto e leggibilità in dark/light mode (se applicabile).
- Responsività: il badge non deve andare a capo nelle liste; truncation non necessaria.

Nota implementativa
- La pagina "Le Mie Prenotazioni" potrà posizionare il badge nella colonna destra della lista o in alto a destra nelle card, seguendo le linee guida sopra. Eventuali futuri stati aggiuntivi dovranno estendere la tabella di mapping e i token CSS dedicati.
