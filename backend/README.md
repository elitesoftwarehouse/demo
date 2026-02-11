Backend scaffolding for SmartDesk Coworking API

This folder contains early scaffolding for the backend. Tech stack: Node.js (18+), TypeScript.

Current scope
- User domain model (TypeScript interface + enums)
- Utility to redact sensitive fields from logs
- Initial PostgreSQL migration to create the users table
- Security services for password hashing and validation
- Minimal DB client (pg) and user repository
- Auth controller with signup handler (framework-agnostic)
- JWT service (HS256) with access/refresh token helpers
- Login controller for issuing tokens
- Migration for user_sessions table (refresh token tracking)
- JWT auth middleware (authGuard) to protect reserved routes
- Refresh/Logout controllers for token rotation and revocation
- Migration to add JTI and revocation metadata to user_sessions

Notes
- Email is stored as CITEXT and is unique (case-insensitive)
- Primary key uses UUID v4 (db default via uuid-ossp)
- Passwords are NEVER stored in plaintext; only password_hash
- Consider using argon2id or bcrypt with cost parameters aligned to production hardware
- Do not log sensitive columns; use userForLog() utility and avoid logging password/hash entirely
- The signup handler validates inputs, handles unique violations (409), and returns 201 with non-sensitive fields only.
- Login handler validates credentials and returns access and refresh JWTs. Persist refresh token hash in user_sessions when wiring a DB-backed session service.
- authGuard validates access tokens from Authorization header and sets req.user; missing/invalid -> 401, missing roles -> 403.
- refreshHandler validates refresh tokens, rotates the session (single-use), and returns new tokens.

JWT configuration
- JWT_SECRET (required), JWT_ISSUER (optional), JWT_AUDIENCE (optional)
- JWT_ACCESS_TTL (default 15m), JWT_REFRESH_TTL (default 7d)

Sessions/Refresh tokens
- Table user_sessions stores only SHA-256 hash of refresh tokens.
- Columns include user_id, refresh_token_hash, user_agent, ip_address, created_at, expires_at, revoked_at
- Additional metadata: jti, revoked_by, revoke_reason (migration 0003)
- Repository provides: createUserSession, findActiveSessionByHash, findSessionByJti, rotateSessionToken, revokeSessionById, revokeAllSessionsForUser, deleteExpiredSessions

Cleanup
- See docs/token-cleanup.md for a simple periodic cleanup approach to delete expired sessions.
