# Bookings components

This folder contains components related to bookings, including MyBookings and BookingList.

Testing and accessibility notes
- MyBookings exposes basic ARIA roles and labels for tabs (Attive, Passate, Cancellate) and pagination controls (Indietro, Avanti) to facilitate both manual and automated tests.
- A manual test checklist is available at ../../test/manual/my-bookings-checklist.md (frontend/test/manual/my-bookings-checklist.md from repo root).
- An E2E testing plan and Playwright examples are documented in ../../README-e2e.md.

Enabling E2E and integration tests
- Install @playwright/test or cypress and add scripts in frontend/package.json.
- Align selectors with the ARIA roles used in MyBookings.
