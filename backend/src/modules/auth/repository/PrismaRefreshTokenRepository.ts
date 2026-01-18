// Prisma-based implementation of IRefreshTokenRepository
// Assumes Prisma schema is defined for refresh_tokens (see prisma/schema.prisma)
// Note: this is a placeholder that demonstrates how the contract would be implemented;
// actual Prisma client import and instance management depend on project setup.

import type { IRefreshTokenRepository, CreateRefreshTokenInput, RefreshTokenRecord } from './RefreshTokenRepository';

// Lazy import to avoid hard dependency in environments without Prisma
let prisma: any;
function getPrisma() {
  if (!prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
    } catch {
      throw new Error('Prisma client not available - install @prisma/client and run prisma generate');
    }
  }
  return prisma;
}

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  async createRefreshToken(data: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const db = getPrisma();
    const rec = await db.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        familyId: data.familyId,
      },
    });
    return map(rec);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const db = getPrisma();
    const rec = await db.refreshToken.findFirst({ where: { tokenHash } });
    return rec ? map(rec) : null;
  }

  async findRefreshTokenById(id: string): Promise<RefreshTokenRecord | null> {
    const db = getPrisma();
    const rec = await db.refreshToken.findUnique({ where: { id } });
    return rec ? map(rec) : null;
  }

  async findActiveTokensByUserId(userId: string, at?: Date): Promise<RefreshTokenRecord[]> {
    const db = getPrisma();
    const ts = (at ?? new Date());
    const recs = await db.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: ts },
      },
      orderBy: { issuedAt: 'desc' },
    });
    return recs.map(map);
  }

  async revokeRefreshToken(id: string, reason?: string, replacementTokenId?: string | null): Promise<void> {
    const db = getPrisma();
    await db.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), revokedReason: reason || 'revoked', replacementTokenId: replacementTokenId ?? null },
    });
  }

  async revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
    const db = getPrisma();
    await db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason || 'revoked-all' },
    });
  }

  async cleanupExpired(before?: Date): Promise<number> {
    const db = getPrisma();
    const cutoff = before ?? new Date();
    const result = await db.refreshToken.deleteMany({ where: { expiresAt: { lte: cutoff } } });
    return result.count ?? 0;
  }
}

function map(r: any): RefreshTokenRecord {
  return {
    id: r.id,
    userId: r.userId,
    tokenHash: r.tokenHash,
    issuedAt: new Date(r.issuedAt),
    expiresAt: new Date(r.expiresAt),
    userAgent: r.userAgent ?? null,
    ipAddress: r.ipAddress ?? null,
    familyId: r.familyId,
    revokedAt: r.revokedAt ? new Date(r.revokedAt) : null,
    revokedReason: r.revokedReason ?? null,
    replacementTokenId: r.replacementTokenId ?? null,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}
