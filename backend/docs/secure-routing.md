Protecting private routes with JWT middleware

Overview
- Use authGuard middleware to validate Bearer access tokens for reserved APIs.
- Configure JWT via env: JWT_SECRET (required), JWT_ISSUER (optional), JWT_AUDIENCE (optional), JWT_ACCESS_TTL, JWT_REFRESH_TTL.

Applying middleware (Express example)
- This repository is framework-agnostic; below is a wiring example once an HTTP server is added.

Example

```ts
import express from 'express';
import { authGuard, requireRoles } from '../src/api/auth/jwt.middleware';
import { signupHandler } from '../src/api/auth/auth.controller';
import { loginHandler } from '../src/api/auth/login.controller';
import { refreshHandler } from '../src/api/auth/refresh.controller';

const app = express();
app.use(express.json());

// Public auth endpoints
app.post('/api/auth/signup', signupHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/refresh', refreshHandler);

// Apply middleware to reserved area
app.use('/api/private', authGuard());

// Examples inside reserved area
app.get('/api/private/profile', (req, res) => res.json({ ok: true }));
app.get('/api/private/admin', authGuard({ roles: ['admin'] }), (req, res) => res.json({ ok: true }));
app.get('/api/private/admin2', requireRoles(['admin']), (req, res) => res.json({ ok: true }));

app.listen(3000);
```

Notes
- authGuard reads Authorization: Bearer <token> from headers and rejects with 401 when missing/invalid.
- If roles are specified and not present in token payload, returns 403.
- For refresh endpoints, keep allowRefresh: true only when explicitly needed.
- For revocation, provide an isRevoked callback that checks token or jti in a denylist or database.
