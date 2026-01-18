# Frontend Testing Notes for 'Le Mie Prenotazioni'

- Unit/component tests added for BookingList and MyBookings:
  - Loading, error, empty states covered
  - Rendering with mock API data and chronological ordering verification
  - Basic responsiveness checks at mobile and desktop widths
- E2E placeholder spec added at frontend/test/e2e/my-bookings.e2e.spec.ts to document steps with Cypress/Playwright.

If running E2E, ensure to set up the chosen runner and fixtures. Known potential layout issues should be captured via visual checks; adapt CSS if truncation occurs on very small widths.
