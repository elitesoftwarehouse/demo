Frontend Docs

This repository contains the frontend application and a set of technical notes that evolve with features. Below the main documentation areas and quick links.

Auth Integration
- See: features/auth/ (AuthContext, tokenStorage, authService) and app/http/* (httpClient, authInterceptor).
- Detailed document: this file (section below) and backend docs for server behavior.

Navigation, routing and date context
- New doc covering bottom navigation, route schema between dashboard map and "Le mie prenotazioni", and shared selected-date state:
  - docs/navigation-routing-bottomnav.md

Booking and calendar
- DatePicker, disabled days and calendar API integration:
  - features/booking/components/DatePicker.tsx
  - features/booking/utils/dateUtils.ts
  - features/calendar/calendarApi.ts
- Dashboard flow (map, confirmation modal) and optimistic update overlay:
  - features/dashboard/pages/DashboardPage.tsx
  - features/dashboard/components/ConfirmBookingModal.tsx

How to get started
- Wrap your app with <AuthProvider> to enable protected routes.
- Use httpRequest(path, { auth: true }) for endpoints that require Authorization.
- For calendar/booking flows, consult the files listed above and the bottom navigation doc to keep URL/date context in sync.

Authentication architecture (frontend)

Components and responsibilities:
- AuthContext (features/auth/AuthContext.tsx)
  - Holds auth state (isAuthenticated, user, error, loading) and exposes actions: login, signup, logout.
  - Restores session on mount by checking presence of an access token in storage.
- authService (features/auth/authService.ts)
  - Calls backend endpoints /auth/login, /auth/signup, /auth/logout.
  - Persists tokens via tokenStorage.setTokens() and clears them on logout.
- tokenStorage (features/auth/tokenStorage.ts)
  - Abstracts chosen storage for tokens (localStorage or sessionStorage) based on apiConfig.tokenStorage.
  - When apiConfig.refreshViaHttpOnlyCookie=true, the refresh token is NOT stored client-side (expected via httpOnly cookie set by backend).
- httpClient (app/http/httpClient.ts)
  - Minimal fetch wrapper. When options.auth=true, automatically adds Authorization: Bearer <accessToken> header.
  - Includes credentials by default if refreshViaHttpOnlyCookie=true (to send/receive cookies with same-origin).
- authInterceptor (app/http/authInterceptor.ts)
  - Helper to transparently attempt a token refresh on 401 responses by calling POST /auth/refresh, then retrying the original request.

Backend alignment
- Expected endpoints and payloads:
  - POST /auth/login  -> { accessToken, refreshToken?, user? }
  - POST /auth/signup -> { accessToken?, refreshToken?, user?, message? }
  - POST /auth/logout -> 204/200 (clears cookie server-side if used)
  - POST /auth/refresh -> { accessToken, refreshToken? } (if rotation enabled and not using cookie-only)
- Access token: JWT (HS256) returned in response body and attached as Authorization: Bearer {token} for protected requests.
- Refresh token: long-lived token; either returned in body and stored client-side (temporary option) or set as httpOnly, Secure cookie by the backend (recommended).

Where and how tokens are stored
- Access token: stored in Web Storage via tokenStorage under key "access_token".
- Refresh token:
  - If apiConfig.refreshViaHttpOnlyCookie=true: NOT stored in Web Storage; backend manages an httpOnly cookie (name/config on server). Frontend sends credentials automatically.
  - Otherwise (temporary): stored in Web Storage under key "refresh_token".

Security implications
- Storing tokens in Web Storage exposes them to XSS. Keep the app CSP-hardened, avoid inline scripts, sanitize user input. Prefer httpOnly, Secure, SameSite cookies for refresh tokens.
- When using cookies, ensure SameSite and CSRF protections on state-changing endpoints.

How tokens are attached to requests
- Use httpRequest(path, { auth: true, ... }) to add Authorization header automatically.
- httpClient sets credentials: 'include' when refreshViaHttpOnlyCookie=true, so cookies are sent on same-origin requests.

Login and signup flows

Basic logical sequence (simplified):
- User -> UI/LoginForm: submit email/password
- UI -> authService.login/signup: POST /auth/(login|signup)
- httpClient -> Backend: send credentials
- Backend -> httpClient: {accessToken, refreshToken?} (and sets httpOnly cookie if configured)
- authService -> tokenStorage: save accessToken (and refreshToken when cookie is not used)
- AuthContext: updates user state (if user returned) and isAuthenticated becomes true

Sequence diagram (textual):

User
  | enter email/password
  v
LoginForm -----------------> authService.login
                               |
                               v
                         httpClient (POST /auth/login)
                               |
                               v
                            Backend
                               |
                  {accessToken, refreshToken?}
                               |
                               v
                         httpClient (parse JSON)
                               |
                               v
                         tokenStorage.setTokens
                               |
                               v
                         AuthContext.setUser
                               |
                               v
                         UI navigates to protected area

Logout flow
- UI -> authService.logout: POST /auth/logout (best-effort)
- tokenStorage.clear(): removes access_token and refresh_token from storage
- AuthContext: sets user to null
- If backend uses cookies, server clears the refresh cookie (and may revoke tokens server-side)

Refresh flow on 401 (optional helper)
- Protected request fails with 401
- authInterceptor.fetchWithAuthRetry calls POST /auth/refresh
- If refresh succeeds, tokens may be rotated and access token updated; original request is retried
- On refresh failure, tokenStorage.clear() and the original 401 error is propagated

Add protected routes

Example with React Router v6+ (create a small ProtectedRoute component):

- Create a component:
  
  import React from 'react';
  import { Navigate, Outlet } from 'react-router-dom';
  import { useAuth } from '../features/auth/AuthContext';
  
  export function ProtectedRoute() {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null; // or a spinner
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
  }

- Use it in your router:
  
  import { createBrowserRouter } from 'react-router-dom';
  import { ProtectedRoute } from './ProtectedRoute';
  
  const router = createBrowserRouter([
    { path: '/', element: <Home /> },
    { path: '/login', element: <LoginPage /> },
    {
      element: <ProtectedRoute />, // wrapper for all protected pages
      children: [
        { path: '/dashboard', element: <Dashboard /> },
        { path: '/account', element: <Account /> },
      ],
    },
  ]);

Making authenticated API calls
- Call httpRequest('/me', { auth: true }) to automatically attach the access token.
- Alternatively, use fetchWithAuthRetry from app/http/authInterceptor to automatically handle 401 + refresh retry.

Environment configuration
- API base URL: VITE_API_BASE_URL | NEXT_PUBLIC_API_BASE_URL | REACT_APP_API_BASE_URL | API_BASE_URL
- Use httpOnly refresh cookie: VITE_AUTH_REFRESH_HTTP_ONLY | NEXT_PUBLIC_AUTH_REFRESH_HTTP_ONLY | REACT_APP_AUTH_REFRESH_HTTP_ONLY | AUTH_REFRESH_HTTP_ONLY
- Token storage: VITE_TOKEN_STORAGE | NEXT_PUBLIC_TOKEN_STORAGE | REACT_APP_TOKEN_STORAGE | TOKEN_STORAGE ('local' default, or 'session')

Error handling
- httpRequest throws an Error with status and data fields on non-OK responses; wrap calls in try/catch in UI.
- AuthContext stores the last error message and exposes it via error.

TODO / Future improvements
- Move to httpOnly, Secure, SameSite cookies for refresh tokens by default (backend already supports it).
- Implement automatic access token renewal shortly before expiry and auto-logout when refresh fails.
- Decode JWT on the client to derive user info/roles and proactively handle expiration (e.g., with a timer).
- Role-based route guards (require roles claim in JWT, e.g., via middleware options on backend).
- Persist and restore user profile from a /me endpoint after reload, rather than only checking token presence.
- Strengthen CSP and add runtime XSS protections; consider iframe sandboxing for risky content.
- Add robust error messages and UX for expired/invalid sessions.
