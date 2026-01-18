JWT Configuration Guidelines

Environment variables
- JWT_ACCESS_SECRET: base64 or raw secret for HS256 signing (min 32 bytes)
- JWT_REFRESH_SECRET: base64 or raw secret for HMAC hashing refresh tokens and optional JWT refresh signing
- JWT_ISSUER: e.g., smartdesk
- JWT_AUDIENCE: e.g., smartdesk-pwa
- JWT_ACCESS_TTL: default 15m (e.g., 900s)
- JWT_REFRESH_TTL: default 30d
- REFRESH_TOKEN_BYTES: default 64

Security practices
- Separate secrets for access and refresh
- Rotate secrets with downtime or key rollover plan
- Keep secrets out of logs and code (use secret manager)
- Set cookie flags if using cookies: httpOnly, secure, sameSite=strict

