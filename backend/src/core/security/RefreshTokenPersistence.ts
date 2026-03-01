// Helpers to integrate RefreshToken persistence with the RefreshTokenHandler
// This module defines hashing utilities for refresh tokens (store only hash),
// repository-driven revocation checks, and helper functions to persist issue/rotation.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { JWTPayload } from './JWTService';
import type { TokenRevocationChecker } from './RefreshTokenHandler';
import type { RefreshTokenRepository } from '../../modules/auth/repository/RefreshTokenRepository';

// Token hashing (never store raw refresh token). We use HMAC-SHA256 with a secret pepper
// derived from AUTH_REFRESH_HASH_SECRET or fallback to AUTH_JWT_SECRET/JWT_SECRET.
const PEPPER = (
  process.env.AUTH_REFRESH_HASH_SECRET ||
  process.env.REFRESH_HASH_SECRET ||
  process.env.AUTH_JWT_SECRET ||
  process.env.JWT_SECRET ||
  ''
).trim();

function getPepper(): string {
  if (!PEPPER) {
    // Intentionally do not throw to avoid crashing, but warn in development contexts
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[security] AUTH_REFRESH_HASH_SECRET not set; using empty pepper. Set a strong secret.');
    }
  }
  return PEPPER;
}

export function hashRefreshToken(rawToken: string): string {
  const secret = getPepper();
  const h = createHmac('sha256', secret);
  h.update(rawToken);
  return h.digest('hex');
}

export function verifyRefreshTokenHash(rawToken: string, expectedHash: string): boolean {
  try {
    const computed = Buffer.from(hashRefreshToken(rawToken));
    const expected = Buffer.from(expectedHash);
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

// Build a TokenRevocationChecker that relies on repository data.
// Rules:
// - If no jti, treat as revoked.
// - If token not found, treat as revoked (strict).
// - If revokedAt present or hash mismatch, treat as revoked.
// - If expired, treat as revoked.
export function createRevocationChecker(repo: RefreshTokenRepository): TokenRevocationChecker {
  return async (jti: string | undefined, rawToken: string, payload?: JWTPayload) => {
    if (!jti) return true;
    const rec = await repo.findByJti(jti);
    if (!rec) return true;
    if (rec.revokedAt) return true;

    // Expiration check (payload.exp as seconds if provided, otherwise compare db field)
    const now = new Date();
    if (rec.expiresAt && new Date(rec.expiresAt) <= now) return true;

    if (!verifyRefreshTokenHash(rawToken, rec.tokenHash)) return true;

    // Optionally update last used timestamp (best-effort)
    try {
      await repo.touchLastUsedAt(jti);
    } catch {
      // ignore
    }

    return false; // not revoked
  };
}

export type IssueMeta = {
  ip?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
};

// Persist a newly issued refresh token
export async function persistIssuedRefreshToken(
  repo: RefreshTokenRepository,
  payload: JWTPayload,
  rawToken: string,
  meta?: IssueMeta,
): Promise<void> {
  const jti = payload.jti;
  const sub = payload.sub;
  const expSec = payload.exp;
  if (!jti || !sub || !expSec) return;

  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(expSec * 1000).toISOString();
  await repo.saveIssuedToken({
    jti,
    userId: sub,
    tokenHash,
    userAgent: meta?.userAgent || null,
    ip: meta?.ip || null,
    deviceId: meta?.deviceId || null,
    expiresAt,
  });
}

// Rotation helper: revoke old jti and persist the new one
export async function persistRotation(
  repo: RefreshTokenRepository,
  oldPayload: JWTPayload,
  oldRaw: string,
  newPayload: JWTPayload,
  newRaw: string,
  meta?: IssueMeta,
): Promise<void> {
  if (oldPayload?.jti) {
    await repo.revokeByJti(oldPayload.jti, 'rotated', oldPayload.sub || null);
  }
  await persistIssuedRefreshToken(repo, newPayload, newRaw, meta);
}

// Bulk revoke all active tokens for user (e.g., global logout)
export async function revokeAllForUser(
  repo: RefreshTokenRepository,
  userId: string,
  reason: string = 'global_revoke',
  byUserId?: string | null,
): Promise<number> {
  return repo.revokeAllForUser(userId, reason, byUserId || null);
}

// Cleanup helper to prune expired tokens
export async function cleanupExpiredRefreshTokens(
  repo: RefreshTokenRepository,
  retentionDays: number = 0,
): Promise<number> {
  const cutoff = new Date();
  if (retentionDays > 0) {
    cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  }
  return repo.deleteExpired(cutoff.toISOString());
}
