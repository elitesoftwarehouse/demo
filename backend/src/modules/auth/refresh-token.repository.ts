import crypto from 'crypto';

export interface RefreshTokenEntity {
  id: string;
  userId: string;
  tokenHash: string; // sha256
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  replacedByTokenHash?: string;
}

const tokens: RefreshTokenEntity[] = [];

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

class RefreshTokenRepository {
  hash(token: string): string {
    return sha256(token);
  }

  async create(params: {
    id: string;
    userId: string;
    token: string;
    userAgent?: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<RefreshTokenEntity> {
    const entity: RefreshTokenEntity = {
      id: params.id,
      userId: params.userId,
      tokenHash: this.hash(params.token),
      userAgent: params.userAgent,
      createdAt: params.createdAt,
      expiresAt: params.expiresAt,
      revoked: false,
    };
    tokens.push(entity);
    return entity;
  }

  async findByToken(token: string): Promise<RefreshTokenEntity | null> {
    const h = this.hash(token);
    const t = tokens.find((x) => x.tokenHash === h) || null;
    return t;
  }

  async findValidByToken(token: string): Promise<RefreshTokenEntity | null> {
    const t = await this.findByToken(token);
    if (!t) return null;
    if (t.revoked) return null;
    if (t.expiresAt.getTime() <= Date.now()) return null;
    return t;
  }

  async revokeByToken(token: string): Promise<void> {
    const h = this.hash(token);
    const idx = tokens.findIndex((x) => x.tokenHash === h);
    if (idx >= 0) {
      tokens[idx].revoked = true;
      tokens[idx].revokedAt = new Date();
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const now = new Date();
    for (const t of tokens) {
      if (t.userId === userId && !t.revoked) {
        t.revoked = true;
        t.revokedAt = now;
      }
    }
  }

  // housekeeping for tests/dev
  async clearAll(): Promise<void> {
    tokens.splice(0, tokens.length);
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
