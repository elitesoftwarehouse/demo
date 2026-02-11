Auth integration guide (frontend)

Overview
- This folder contains minimal building blocks to integrate the PWA with backend auth APIs using JWT (access + refresh).
- IMPORTANT: For production, prefer HttpOnly/Secure cookies managed by the server for refresh tokens. This demo stores tokens in localStorage as a temporary solution and attaches access tokens via Authorization header.

Files
- tokenStorage.ts
  - getAuthState(), setAuthState(), clearAuthState()
  - Small wrapper around localStorage to persist { accessToken, refreshToken, user }.
- authService.ts
  - login(email, password): calls /auth/login and stores tokens
  - signup(email, password): calls /auth/signup (does not auto-login by default)
  - logout(): clears storage
  - getCurrentAuth(): reads from storage
- httpClient.ts
  - httpGet/httpPost wrappers that include Authorization: Bearer <accessToken> when present.

Usage
- Wrap your app with <AuthProvider> from src/context/AuthContext to expose auth state and actions.
- Use httpClient for protected API calls.

Security notes
- Storing tokens in localStorage exposes them to XSS. Mitigate with strong CSP, input sanitization, and libraries that escape HTML.
- Consider migrating to HttpOnly cookies for refresh and keep access tokens short-lived (e.g., 15 minutes).
