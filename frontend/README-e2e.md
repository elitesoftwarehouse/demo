E2E Testing Plan for "Le Mie Prenotazioni" — Paginazione e Filtro Stato

Strumenti suggeriti
- Cypress o Playwright (non inclusi nel progetto attuale). Esempi mostrati con Playwright.

Obiettivi copertura
- Filtraggio per ciascuno stato (Attive, Passate, Cancellate)
- Navigazione pagine avanti/indietro e limiti
- PageSize (se presente)
- Empty state
- Coerenza metadati UI vs. API (totalItems, totalPages)

Setup (Playwright)
- npm i -D @playwright/test
- npx playwright install
- Aggiungere script: "test:e2e": "playwright test"

Esempio spec (pseudo):

import { test, expect } from '@playwright/test';

test.describe('Le Mie Prenotazioni - pagination & filter', () => {
  test.beforeEach(async ({ page }) => {
    // Autenticazione helper (cookie/session) o login UI
    await page.goto('/login');
    // ... compila e invia form
  });

  test('switch states resets to page 1', async ({ page }) => {
    await page.goto('/app/mie-prenotazioni');
    await page.getByRole('button', { name: /avanti/i }).click();
    await page.getByRole('tab', { name: /passate/i }).click();
    await expect(page.getByText(/pagina\s*1\s*di/i)).toBeVisible();
  });

  test('paginate within bounds', async ({ page }) => {
    await page.goto('/app/mie-prenotazioni');
    const prev = page.getByRole('button', { name: /indietro/i });
    await expect(prev).toBeDisabled();
    // Naviga fino a ultima pagina e verifica avanti disabilitato
  });

  test('empty state visible when no results', async ({ page }) => {
    await page.goto('/app/mie-prenotazioni?state=CANCELLATA');
    await expect(page.getByText(/nessuna prenotazione/i)).toBeVisible();
  });
});

Note
- Adattare i selettori ad aria-label e ruoli effettivi
- In ambienti non connessi a backend, usare mocking di rete (route interception) per simulare risposte con totalItems/totalPages coerenti
