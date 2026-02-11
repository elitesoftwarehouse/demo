Frontend authentication overview (for backend alignment)

Purpose
- Provide backend developers a concise view of the SPA auth behavior to align API contracts and token lifecycle expectations.

Current behavior
- Login (POST /api/auth/login) returns: { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, tokenType, user }
- Signup (POST /api/auth/signup) returns: { user }
- The SPA:
  - Persists accessToken and refreshToken in localStorage under key "demo.auth.state" along with user info.
  - Reads the accessToken and attaches it to protected requests using Authorization: Bearer <token>.
  - Does not automatically refresh tokens yet; no global interceptor is implemented.
  - Logout clears localStorage and in-memory state; it does not currently call backend logout endpoints.

Implications for backend
- Access token validation is handled by authGuard on protected endpoints.
- For refresh flow: SPA can call POST /api/auth/refresh with the refresh token if/when a client-side refresh helper is implemented.
- Consider supporting HttpOnly cookie for refresh tokens to reduce XSS risk; SPA would stop storing refresh token in JS-accessible storage.
- Provide clear 401/403 semantics; SPA can interpret 401 to trigger re-auth or refresh.

Recommended API contracts (aligned with existing code)
- POST /api/auth/login -> 200 { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, tokenType: 'Bearer', user }
- POST /api/auth/signup -> 201 { user }
- POST /api/auth/refresh -> 200 { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, tokenType, user }
- POST /api/auth/logout -> 200 { ok: true } (expects refresh token if not using cookies)
- POST /api/auth/logoutAll -> 200 { ok: true } (auth required; revokes all sessions)

Future alignment
- When moving refresh token to HttpOnly cookies, define cookie name, SameSite, Secure and path policy. SPA will read access token from response and keep it in memory.
- Expose token expiration times in responses for better client-side UX (e.g., proactive refresh).
- Emit WWW-Authenticate header on 401 with reason to help SPA decide between refresh vs redirect to login.
