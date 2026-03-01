Navigation and Bottom Navigation — Developer Notes
Version: 1.0 — 2026-01-17

Scope
- Explain how to implement the BottomNav component, route schema, and shared selected-date context to keep UX consistent between Dashboard and “My Bookings”.

Files and locations (conventions)
- AppShell: src/app/layout/AppShell.tsx (router outlet + persistent BottomNav)
- BottomNav: src/features/navigation/BottomNav.tsx
- Route constants: src/app/routing/routes.ts
- Nav items config: src/features/navigation/navConfig.ts
- Date context: src/app/state/DateContext.tsx (Provider + useDate())

Routing schema
- '/': DashboardPage (map)
- '/my-bookings': MyBookingsPage (protected)
- Optional query param 'date=YYYY-MM-DD' shared between pages.
- ProtectedRoute wrapper for all protected sections.

Date state rules
- Source of truth: DateContext at AppShell level.
- Initialization priority: URL (?date) > persisted storage > today.
- Consumers: DashboardPage and MyBookingsPage read from useDate(); updates propagate across tabs.
- Edge cases: invalid or closed dates remain in context but UI disables actions; backend validation prevails.

Extending BottomNav
- Add route in routes.ts, add entry in navConfig.ts, implement the page under features/<feature>/pages.
- If the new section participates in the date context, read and update via useDate(), keep URL in sync.

Tests
- See docs/navigation-routing-bottomnav.md for the list of expected unit/integration tests to cover.
