# Piano E2E — Pagina "Le Mie Prenotazioni" con Playwright

Stato: Proposta (pronto per implementazione)

Obiettivo
- Automatizzare i casi principali di paginazione e filtro stato per ridurre regressioni.

Prerequisiti
- Aggiungere devDependency: @playwright/test
- Script npm suggeriti (nel package.json del frontend o root monorepo):
  - "test:e2e": "playwright test"
  - "test:e2e:ui": "playwright test --ui"
- Config base playwright.config.ts con baseURL puntato al dev server (es. http://localhost:5173) e webServer per avvio app.

Selettori
- Usare data-testid documentati in docs/frontend-my-bookings-qa-checklist.md

Casi di test
1) Filtri stato
   - ALL → visibilità Prossime + toggle Passate
   - ATTIVA → solo Prossime con paginatore
   - PASSATA → solo Passate con paginatore
   - CANCELLATA → verifica elenco consistente

2) Paginazione
   - Avanti/indietro su Prossime, senza overlap tra pagine
   - Avanti/indietro su Passate

3) PageSize
   - Selezioni 10/20/50 e verifica numero righe

4) Nessun risultato
   - Mock di risposta /api/bookings/me con items: []

5) Cancellazione (smoke)
   - Mock POST /api/bookings/{id}/cancel con 200 e verifica rimozione riga

Esempio test (pseudo):
```ts
import { test, expect } from '@playwright/test';

test('filtri e paginazione', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Login mock' }).click();
  await page.goto('/dashboard/prenotazioni');

  // Cambio filtro ATTIVA
  await page.getByTestId('filter-ATTIVA').click();
  await expect(page.getByTestId('paginator-future')).toBeVisible();

  // Avanti
  await page.getByTestId('paginator-future-next').click();
  await expect(page.getByText('Pagina 2')).toBeVisible();
});
```

Note
- Per ambienti CI, usare `npx playwright install --with-deps`.
- Per mocking HTTP, usare `page.route('**/api/bookings/me*', route => route.fulfill(...))`.
