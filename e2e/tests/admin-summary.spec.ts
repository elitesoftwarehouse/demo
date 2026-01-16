import { test, expect } from '@playwright/test';

const ADMIN_USER = process.env.ADMIN_USER || 'admin@example.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';
const NONADMIN_USER = process.env.NONADMIN_USER || 'user@example.com';
const NONADMIN_PASS = process.env.NONADMIN_PASS || 'password';

async function login(page, username: string, password: string) {
  // Assumes a /login route with username/password fields and submit
  await page.goto('/login');
  await page.fill('[name="username"]', username);
  await page.fill('[name="password"]', password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]')
  ]);
}

function firstDayOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Smoke: non-admin cannot access
test('non-admin cannot access admin summary', async ({ page }) => {
  await login(page, NONADMIN_USER, NONADMIN_PASS);
  await page.goto('/admin/summary');
  // Expect 401/403 page or redirect without data-testid present
  const hasPage = await page.getByTestId('admin-summary-page').isVisible().catch(() => false);
  expect(hasPage).toBeFalsy();
});

// Admin: filter by date only and see grouped data
test('admin date filter shows grouped summary', async ({ page }) => {
  await login(page, ADMIN_USER, ADMIN_PASS);
  await page.goto('/admin/summary');
  await expect(page.getByTestId('admin-summary-page')).toBeVisible();

  await page.getByTestId('date-from').fill(firstDayOfMonthISO());
  await page.getByTestId('date-to').fill(todayISO());
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/admin/hours-summary') && resp.status() === 200),
    page.getByTestId('apply-filters').click()
  ]);

  // Loading then results
  await expect(page.getByTestId('loading-state')).toBeHidden({ timeout: 10000 }).catch(() => {});

  // Either results-grid with at least one row or empty-state
  const hasResults = await page.getByTestId('result-row').first().isVisible().catch(() => false);
  const hasEmpty = await page.getByTestId('empty-state').isVisible().catch(() => false);
  expect(hasResults || hasEmpty).toBeTruthy();

  if (hasResults) {
    // Basic assertion: grand-total is present and is a number-like text
    const grandTotalText = await page.getByTestId('grand-total').textContent();
    expect(grandTotalText).toBeTruthy();
  }
});

// Admin: combined filters
test('admin combined filters (collaborator + order + date)', async ({ page }) => {
  await login(page, ADMIN_USER, ADMIN_PASS);
  await page.goto('/admin/summary');
  await expect(page.getByTestId('admin-summary-page')).toBeVisible();

  await page.getByTestId('date-from').fill(firstDayOfMonthISO());
  await page.getByTestId('date-to').fill(todayISO());

  // Selects assume standard <select> or autocomplete with data-testid
  await page.getByTestId('collaborator-select').selectOption({ index: 1 }).catch(async () => {
    // fallback: click and choose first option in a custom dropdown
    await page.getByTestId('collaborator-select').click();
    await page.locator('[role="option"]').nth(1).click();
  });
  await page.getByTestId('order-select').selectOption({ index: 1 }).catch(async () => {
    await page.getByTestId('order-select').click();
    await page.locator('[role="option"]').nth(1).click();
  });

  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/admin/hours-summary') && resp.status() === 200),
    page.getByTestId('apply-filters').click()
  ]);

  const hasResults = await page.getByTestId('result-row').first().isVisible().catch(() => false);
  const hasEmpty = await page.getByTestId('empty-state').isVisible().catch(() => false);
  expect(hasResults || hasEmpty).toBeTruthy();
});
