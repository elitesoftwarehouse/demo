// Domain entity for RefreshToken persistence

export interface RefreshToken {
  jti: string; // token id
  userId: string;
  tokenHash: string; // store hash only
  userAgent?: string | null;
  ip?: string | null;
  deviceId?: string | null;
  createdAt: string; // ISO
  lastUsedAt?: string | null; // ISO
  expiresAt: string; // ISO
  revokedAt?: string | null; // ISO
  revokedBy?: string | null; // userId or system id
  reason?: string | null;
}
