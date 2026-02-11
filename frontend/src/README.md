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
- All API clients accept an optional baseUrl (default: /api).
- For protected resources, the accessToken from AuthContext is sent as Authorization: Bearer <token>.

---

Routing, dashboard and bookings page

- AppRouter defines a protected area under /dashboard with nested routes:
  - /dashboard/mappa: page DashboardPage (availability map)
  - /dashboard/prenotazioni: page MyBookingsPage (this task)
- BottomNavigation includes links to the map and to "Le mie prenotazioni".
- MyBookingsPage fetches the user's bookings from GET /api/bookings/my with optional pagination (page, size). The API is expected to return the list already ordered chronologically; the UI preserves server order and only labels future vs. past entries for readability.
- The page handles loading, error and empty states, is responsive and uses semantic HTML (table) for accessibility.
