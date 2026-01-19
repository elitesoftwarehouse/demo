// Minimal in-memory refresh token repository for MVP.
// In real project, integrate with Prisma/PostgreSQL and store token hash, device info, etc.

import bcrypt from 'bcrypt';

export interface RefreshTokenRecord {
  id: string; // token id (uuid-like)
  userId: string;
  tokenHash: string;
  userAgent?: string;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
  revoked: boolean;
}

const records: RefreshTokenRecord[] = [];

function genId() {
  return 'rt_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

class RefreshTokenRepository {
  async save(token: string, userId: string, expiresAt: number, userAgent?: string) {
    const tokenHash = await bcrypt.hash(token, 10);
    const rec: RefreshTokenRecord = {
      id: genId(),
      userId,
      tokenHash,
      userAgent,
      createdAt: Date.now(),
      expiresAt,
      revoked: false,
    };
    records.push(rec);
    return rec;
  }

  async findValidForUser(userId: string, token: string): Promise<RefreshTokenRecord | null> {
    const now = Date.now();
    for (const r of records) {
      if (r.userId !== userId) continue;
      if (r.revoked) continue;
      if (r.expiresAt <= now) continue;
      const match = await bcrypt.compare(token, r.tokenHash);
      if (match) return r;
    }
    return null;
  }

  async revoke(recordId: string): Promise<void> {
    const idx = records.findIndex((r) => r.id === recordId);
    if (idx >= 0) records[idx].revoked = true;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const r of records) {
      if (r.userId === userId) r.revoked = true;
    }
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
