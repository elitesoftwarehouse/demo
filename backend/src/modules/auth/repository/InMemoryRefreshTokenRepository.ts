// In-memory repository for refresh tokens (for testing/demo only)
// Stores only hashes (no plaintext). Not suitable for production.

import type { CreateRefreshTokenInput, IRefreshTokenRepository, RefreshTokenRecord } from './RefreshTokenRepository';

export class InMemoryRefreshTokenRepository implements IRefreshTokenRepository {
  private items: RefreshTokenRecord[] = [];

  async createRefreshToken(data: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const now = new Date();
    const rec: RefreshTokenRecord = {
      id: randomId(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      issuedAt: data.issuedAt,
      expiresAt: data.expiresAt,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      familyId: data.familyId,
      revokedAt: null,
      revokedReason: null,
      replacementTokenId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(rec);
    return rec;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.items.find((i) => i.tokenHash === tokenHash) || null;
  }

  async findRefreshTokenById(id: string): Promise<RefreshTokenRecord | null> {
    return this.items.find((i) => i.id === id) || null;
  }

  async findActiveTokensByUserId(userId: string, at?: Date): Promise<RefreshTokenRecord[]> {
    const ts = (at ?? new Date()).getTime();
    return this.items.filter((i) => i.userId === userId && !i.revokedAt && new Date(i.expiresAt).getTime() > ts);
  }

  async revokeRefreshToken(id: string, reason?: string, replacementTokenId?: string | null): Promise<void> {
    const rec = this.items.find((i) => i.id === id);
    if (rec) {
      rec.revokedAt = new Date();
      rec.revokedReason = reason || 'revoked';
      rec.replacementTokenId = replacementTokenId ?? null;
      rec.updatedAt = new Date();
    }
  }

  async revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
    const now = new Date();
    for (const i of this.items) {
      if (i.userId === userId && !i.revokedAt) {
        i.revokedAt = now;
        i.revokedReason = reason || 'revoked-all';
        i.updatedAt = now;
      }
    }
  }

  async cleanupExpired(before?: Date): Promise<number> {
    const cutoff = (before ?? new Date()).getTime();
    const original = this.items.length;
    // Keep items that are not expired OR that are revoked but not expired? For cleanup, delete if expired AND revoked or just expired
    // Strategy: remove any token whose expiresAt <= cutoff
    this.items = this.items.filter((i) => new Date(i.expiresAt).getTime() > cutoff);
    return original - this.items.length;
  }
}

function randomId(): string {
  const { randomBytes } = require('crypto');
  const b = randomBytes(16);
  const hex = b.toString('hex');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}
