Test plan — My Bookings (pagination and state filter)
Version: 1.0 — 2026-01-17

Scope
- Validate functional behavior and cross-browser usability of the pagination and status filter in the "Le Mie Prenotazioni" page.
- Where possible, cover via automated component tests; remaining parts verified manually.

Functional scenarios (check-list)
1) Initial load and defaults
- Given no query parameters, the page loads with:
  - Filter = "Tutte"
  - page = 1, pageSize = 10
  - URL updates to ?page=1&pageSize=10 (state omitted when filter = Tutte)
- The list shows N items (<= pageSize) and the paginator total reflects API total.

2) Filter by state (Attive / Passate / Cancellate)
- Switching filter to each state triggers a new fetch with the selected state.
- On filter change, the page resets to 1.
- URL query syncs state (e.g., ?state=ATTIVA&page=1&pageSize=10). Returning to "Tutte" removes state from the URL.

3) Pagination forward/backward
- Next button moves from page k to k+1 until the last page; disabled on last page.
- Previous button moves from page k to k-1 until page 1; disabled on first page.
- The list updates accordingly; the paginator label ("Pagina X di Y") stays consistent with API metadata.

4) Change pageSize
- Changing pageSize (e.g., 10 → 20 → 50) triggers a new fetch and resets page to 1.
- The number of items rendered per page does not exceed pageSize.
- The URL query parameter pageSize is updated.

5) Empty results
- When API returns items = [] and total = 0, the page renders the empty state message: "Nessuna prenotazione trovata." and the paginator shows page 1 of 1.
- When API returns items = [] but total > 0 (edge), verify paginator still reflects total; treat as transient error in data source.

6) Consistency checks
- The number of rows rendered equals items.length from API (<= pageSize).
- The paginator total pages equals ceil(total / pageSize).
- Status badge label matches normalized backend state: ATTIVA → "Attiva", PASSATA → "Passata", CANCELLATA → "Cancellata".

7) URL deep-link and restoration
- With initial URL like ?state=PASSATA&page=2&pageSize=20, the page initializes with those values and immediately fetches with them.
- Navigating back/forward preserves the latest state in the URL (location.replace is used; refresh should restore the same state).

Cross-browser manual verification
- Browsers: Chrome (latest), Edge (latest), Firefox (latest).
- Viewports: desktop (~1440x900), tablet (~1024x768), small laptop (~1280x800).
- Verify:
  - Filter control visible: as chip group (default) and with sufficient spacing; labels accessible.
  - In very narrow widths, consider using the select variant from StatusFilter with condensed=true if implemented in parent (not mandatory in this version).
  - Paginator controls visible, hit area adequate, disabled states correctly styled.
  - Keyboard navigation: tab focus on filter chips and paginator buttons; Enter/Space activates selection.
  - Screen-reader labels: StatusFilter with aria-label, Paginator buttons with aria-label ("Pagina precedente" / "Pagina successiva").

Data integrity checks during manual tests
- Capture API responses (Network tab) and verify UI consistency:
  - items.length <= pageSize from query
  - sum of items across pages equals total (when iterating the entire range)
  - changing state filter updates the "state" query parameter and request payload accordingly.

E2E tests (if/when test harness exists)
- If Cypress/Playwright is available in the project, add flows covering:
  - Visit /my-bookings with seeded data → filter ATTIVA/PASSATA/CANCELLATA → assert rows and paginator.
  - Paginate forward/backward and assert URL + list changes.
  - Change page size and assert reset to first page.
  - Edge: API returns empty list → assert empty state rendering.
- Use test data fixtures to ensure deterministic totals and states.

Known limitations and notes
- The current implementation updates the URL via replaceState for smoother UX; browser back may not navigate through intermediate changes.
- The StatusFilter component provides both chip and select variants; the parent currently renders the chip variant.
- Accessibility matchers in unit tests use optional chaining to work without jest-dom setup.

Bug log template
- Title:
- Environment (browser + version, OS):
- Steps to reproduce:
- Expected behavior:
- Actual behavior:
- Screenshots/recording:
- Notes / possible cause:
