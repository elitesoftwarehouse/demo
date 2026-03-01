import type { RefreshToken } from '../domain/entities/RefreshToken';

export type SaveIssuedToken = {
  jti: string;
  userId: string;
  tokenHash: string;
  userAgent?: string | null;
  ip?: string | null;
  deviceId?: string | null;
  expiresAt: string; // ISO
};

export interface RefreshTokenRepository {
  // Persist a newly issued refresh token
  saveIssuedToken(data: SaveIssuedToken): Promise<void>;

  // Lookup by token jti
  findByJti(jti: string): Promise<RefreshToken | null>;

  // Revoke by jti
  revokeByJti(jti: string, reason?: string, byUserId?: string | null): Promise<boolean>;

  // Revoke all user tokens (returns number of tokens revoked)
  revokeAllForUser(userId: string, reason?: string, byUserId?: string | null): Promise<number>;

  // Update lastUsedAt for analytics/anti-abuse
  touchLastUsedAt(jti: string): Promise<void>;

  // Delete expired tokens. Returns number of records deleted.
  deleteExpired(cutoffIso?: string): Promise<number>;
}
