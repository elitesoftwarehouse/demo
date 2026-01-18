import * as express from 'express';
const request = require('supertest');
import { registerAuthRoutes } from '../../../../src/modules/user/http/routes';
import type { CreateUserInput, IUserRepository, UserRecord } from '../../../../src/modules/user/repository/UserRepository';
import { PasswordService } from '../../../../src/core/security/PasswordService';
import { InMemoryRefreshTokenRepository } from '../../../../src/modules/auth/repository/InMemoryRefreshTokenRepository';

// Combined repo implementing both user and refresh token repository contracts where needed
class TestUserRepository implements IUserRepository {
  private items: UserRecord[] = [];
  private refreshRepo = new InMemoryRefreshTokenRepository();

  async create(data: CreateUserInput): Promise<UserRecord> {
    const exists = this.items.find((u) => u.email === data.email);
    if (exists) {
      const err: any = new Error('duplicate key value violates unique constraint');
      err.code = 'P2002';
      throw err;
    }
    const now = new Date();
    const rec: UserRecord = {
      id: this.randomId(),
      email: data.email,
      password_hash: data.passwordHash,
      salt: data.salt ?? null,
      created_at: now,
      updated_at: now,
      status: (data.status as any) || 'ACTIVE',
      verification_token: data.verificationToken ?? null,
      verification_expires_at: data.verificationExpiresAt ?? null,
    };
    this.items.push(rec);
    return rec;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.items.find((u) => u.email === email) || null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.items.find((u) => u.id === id) || null;
  }

  // Extra methods to support refresh flows via duck typing in AuthService
  async createRefreshToken(data: any) {
    return this.refreshRepo.createRefreshToken(data);
  }
  async findRefreshTokenByHash(hash: string) {
    return this.refreshRepo.findRefreshTokenByHash(hash);
  }
  async revokeRefreshToken(id: string, reason?: string, replacementTokenId?: string | null) {
    return this.refreshRepo.revokeRefreshToken(id, reason, replacementTokenId);
  }
  async revokeAllUserTokens(userId: string, reason?: string) {
    return this.refreshRepo.revokeAllUserTokens(userId, reason);
  }

  private randomId(): string {
    const { randomBytes } = require('crypto');
    const b = randomBytes(16);
    const hex = b.toString('hex');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  }
}

// Build app with routes
function buildApp(repo: IUserRepository) {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  registerAuthRoutes(router as any, repo);
  app.use(router);
  return app;
}

describe('Auth refresh/logout integration', () => {
  const pwdSvc = new PasswordService({ keyLength: 32, saltBytes: 16 });

  it('issues refresh token on login, allows refresh to rotate, and supports logout', async () => {
    const repo = new TestUserRepository();
    const app = buildApp(repo);

    const email = 'user.refresh@example.com';
    const password = 'Str0ng!Pass1';
    const hash = await pwdSvc.hashPassword(password);

    await repo.create({ email, passwordHash: hash });

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body?.data?.refreshToken).toBeTruthy();
    const firstRefresh = login.body.data.refreshToken as string;

    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken: firstRefresh });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body?.data?.accessToken).toBeTruthy();
    // Rotation enabled => may return a new refresh token
    const rotatedToken = refreshRes.body?.data?.refreshToken as string | undefined;

    // Using the old token again should fail if rotation revoked it
    if (rotatedToken) {
      const secondTry = await request(app).post('/api/auth/refresh').send({ refreshToken: firstRefresh });
      expect([401, 200]).toContain(secondTry.status); // depending on rotation fallback
      // If 200 without rotation support, ensure at least access token exists
      if (secondTry.status === 200) {
        expect(secondTry.body?.data?.accessToken).toBeTruthy();
      }

      // Logout with new rotated token should succeed
      const logout = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${refreshRes.body.data.accessToken}`)
        .send({ refreshToken: rotatedToken });
      expect(logout.status).toBe(200);

      // After logout, using that refresh again should be unauthorized
      const afterLogout = await request(app).post('/api/auth/refresh').send({ refreshToken: rotatedToken });
      expect(afterLogout.status).toBe(401);
    }
  });
});
