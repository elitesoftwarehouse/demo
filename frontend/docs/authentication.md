Authentication in the PWA (Frontend)

Scope
- This document explains the client-side authentication architecture, token handling and how to protect routes in the React app. It complements backend docs about JWT.

Key modules
- AuthContext (src/context/AuthContext.tsx)
  - React context/provider exposing: state, loading, error, login(email,password), signup(email,password), logout().
  - Initializes state from tokenStorage.getAuthState() and persists updates via tokenStorage.setAuthState().
  - Calls authService for actual API interactions.
- authService (src/auth/authService.ts)
  - Bridges UI with API client (src/api/authClient.ts).
  - On successful login, builds a StoredAuthState and saves it using tokenStorage.
- tokenStorage (src/auth/tokenStorage.ts)
  - Reads/writes a JSON blob under localStorage key "demo.auth.state".
  - Shape: { isAuthenticated, accessToken?, refreshToken?, user }.
- ProtectedRoute (src/router/ProtectedRoute.tsx)
  - Guards private routes by reading state from AuthContext and redirecting/denying when unauthenticated.
- useAuth (src/hooks/useAuth.ts)
  - Convenience hook to access AuthContext methods/state and propagate baseUrl.

Token storage
- Where: localStorage (key: demo.auth.state).
- What: accessToken, refreshToken, user and isAuthenticated flag.
- Why: keep user logged in across reloads and sessions.
- Security considerations:
  - Tokens in localStorage are accessible to JS -> risk in case of XSS. Mitigate with CSP, no inline scripts, sanitization, and dependency hygiene.
  - Alternative (recommended for refresh): use HttpOnly, Secure, SameSite cookies set by the backend. Keep access token only in memory.
  - sessionStorage can be used to limit lifetime to a tab.

Attaching tokens to requests
- For protected API calls after login, add header:
  - Authorization: Bearer <accessToken>
- Example:
  - import { getAuthState } from '../auth/tokenStorage';
  - const { accessToken } = getAuthState();
  - await fetch('/api/private/data', { headers: { Authorization: `Bearer ${accessToken}` } });
- There is no shared HTTP client with interceptors yet; attach the header manually or implement a thin wrapper.

Flow diagrams (logical)
- Login
  1) AuthPage -> useAuth.login -> AuthContext.login
  2) authService.login -> authClient.login(POST /auth/login)
  3) Backend -> { accessToken, refreshToken, user, ... }
  4) authService -> tokenStorage.setAuthState(next)
  5) AuthContext updates state -> UI navigates to protected routes

- Signup
  1) AuthPage -> useAuth.signup -> AuthContext.signup
  2) authService.signup -> authClient.signup(POST /auth/signup)
  3) Backend -> { user }
  4) UI may prompt login or auto-switch to login form

Logout
- AuthContext.logout clears storage via tokenStorage.clearAuthState() and resets state.
- No server-side revocation is called by default; optionally call POST /auth/logout with refreshToken if backend supports it.

Adding protected routes (React Router v6)
- Wrap route element with ProtectedRoute. Example:

  <AuthProvider baseUrl="/api">
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/app" element={
        <ProtectedRoute>
          <AppHome />
        </ProtectedRoute>
      } />
    </Routes>
  </AuthProvider>

Configuration
- baseUrl: Default is '/api'. Override via <AuthProvider baseUrl="..." />.
- Backend endpoints expected:
  - POST /api/auth/signup -> { user }
  - POST /api/auth/login  -> { accessToken, refreshToken, tokenType, user, ... }

Error handling
- authClient throws on non-2xx with an Error(message=payload.error or fallback).
- AuthContext exposes error string code; AuthPage displays simple errors.

Future improvements / TODO
- Move refresh token to HttpOnly cookie and keep only access token in memory; persist minimal user state.
- Implement a centralized httpClient to:
  - inject Authorization header automatically
  - handle 401 by attempting refresh (token rotation) or logging out
  - queue requests while refreshing and deduplicate concurrent refreshes
- Add token expiry awareness (decode exp) and proactive refresh or auto-logout on expiration.
- Cross-tab synchronization via window.storage events to propagate login/logout.
- Support logoutAll to revoke all sessions on the backend.

Security checklist
- Never log tokens.
- Use HTTPS in production.
- Apply CSP and sanitize/escape untrusted HTML.
- Keep dependencies patched and avoid unsafe eval/Function.
