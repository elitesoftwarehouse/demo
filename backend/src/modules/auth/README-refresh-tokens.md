SmartDesk - Refresh Tokens Persistence and Revocation

Scope
- Define data model and repository interfaces to manage refresh tokens securely.
- Store only hashed refresh tokens (HMAC-SHA256) and metadata.
- Support single-token revocation, global user revocation, rotation, and cleanup of expired tokens.

Data Model (DB table: refresh_tokens)
- id (UUID primary key)
- user_id (FK users.id)
- token_hash (VARCHAR 255)
- issued_at (timestamptz)
- expires_at (timestamptz)
- revoked_at (timestamptz, nullable)
- revoked_reason (varchar 255, nullable)
- revoked_by (varchar 255, nullable)
- user_agent (varchar 255, nullable)
- ip_address (varchar 64, nullable)
- family_id (UUID, group id for rotation)
- replacement_token_id (UUID, nullable)
- created_at, updated_at

Repository Contract
- IRefreshTokenRepository with methods:
  - createRefreshToken
  - findRefreshTokenByHash
  - findRefreshTokenById
  - findActiveTokensByUserId
  - revokeRefreshToken
  - revokeAllUserTokens
  - cleanupExpired

Integration
- AuthService.login persists new refresh token (hash only) with context info
- AuthService.refresh validates, rotates (creates new record, revokes previous)
- AuthService.logout supports single token revocation or global by userId

Cleanup Strategy
- Provided helper function cleanupExpiredRefreshTokens to purge tokens with expiresAt <= now
- Schedule with cron or queue as needed
