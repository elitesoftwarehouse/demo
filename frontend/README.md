# Frontend

Testing setup

- Jest configured via root jest.config.js with a frontend project using jsdom.
- React Testing Library is used for UI tests.
- Tests live under frontend/src/**/__tests__ and as *.test.ts(x).

Run tests

- npm test (from repository root)

---

Authentication (frontend)

Overview
- The PWA implements a simple JWT-based authentication (access + refresh) aligned with the backend API.
- Core building blocks:
  - AuthContext (frontend/src/context/AuthContext.tsx): React context/provider exposing state, login, signup, logout. Restores session from storage at boot.
  - authService (frontend/src/auth/authService.ts): Thin service that calls API client, persists tokens to tokenStorage and returns updated auth state.
  - tokenStorage (frontend/src/auth/tokenStorage.ts): Persists a single JSON blob under localStorage key "demo.auth.state" with accessToken, refreshToken and user.
  - ProtectedRoute (frontend/src/router/ProtectedRoute.tsx): Wrapper component to guard routes that require authentication.
  - useAuth hook (frontend/src/hooks/useAuth.ts): Convenience hook to access AuthContext and baseUrl.

Data model (stored client-side)
- StoredAuthState: { isAuthenticated: boolean; accessToken?: string; refreshToken?: string; user: { id, email, status? } | null }
- Storage key: demo.auth.state (localStorage)
- Session restore: AuthProvider initializes its state from tokenStorage.getAuthState() at mount and keeps it in sync via setAuthState().

Where and how tokens are used
- On login, authService.login(email, password) calls POST /api/auth/login and stores tokens in tokenStorage.
- On logout, authService.logout() clears state and storage.
- Access tokens are attached to API requests via httpClient (frontend/src/auth/httpClient.ts) when needed.

---

Navigation, routing and selected date context

Bottom navigation
- Component: frontend/src/components/Navigation/BottomNavigation.tsx
- Purpose: persistent bottom bar to switch between main areas
- Default entries:
  - Mappa: /dashboard/mappa
  - Le mie prenotazioni: /dashboard/prenotazioni
- Uses NavLink from react-router-dom to reflect active state; accessible via role="navigation" and aria-label
- Styling: fixed at bottom, touch-friendly targets

Routing schema
- Main routes under /dashboard/* with views:
  - /dashboard/mappa (map view)
  - /dashboard/prenotazioni (my bookings)
- Shared query param: ?date=YYYY-MM-DD preserved across navigation
- Protected routes can be implemented via ProtectedRoute around /dashboard

Selected date state management
- Context: frontend/src/context/SelectedDateContext.tsx
  - API: useSelectedDate() -> { date: string; setDate(next: string | Date) }
  - Provider: <SelectedDateProvider>
- Initialization: reads ?date from URL on mount; defaults to today if missing/invalid
- Sync behavior:
  - When date changes, updates the current URL query with navigate(..., { replace: true }) to avoid history bloat
  - When URL query changes (deep link), updates internal state if valid
- Consumers:
  - Map page updates the date via setDate
  - My bookings page reads date to filter data

Extending bottom navigation
- Add new items in BottomNavigation.tsx items array: { key, label, to }
- Create corresponding route under /dashboard
- If the new section depends on selected date, read it via useSelectedDate(); avoid manual query handling

Tests
- Component tests for bottom nav under frontend/src/components/Navigation/__tests__
- Suggested tests for date context under frontend/src/context/__tests__ (sync rules, validation)

For a detailed guide, see frontend/docs/navigation-routing.md
