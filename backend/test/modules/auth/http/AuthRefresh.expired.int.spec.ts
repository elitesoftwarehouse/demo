import * as express from 'express';
const request = require('supertest');
import { registerAuthRoutes } from '../../../../src/modules/user/http/routes';
import type { CreateUserInput, IUserRepository, UserRecord } from '../../../../src/modules/user/repository/UserRepository';
import { PasswordService } from '../../../../src/core/security/PasswordService';
import { InMemoryRefreshTokenRepository } from '../../../../src/modules/auth/repository/InMemoryRefreshTokenRepository';

class TestUserRepository implements IUserRepository {
  private items: UserRecord[] = [];
  private refreshRepo = new InMemoryRefreshTokenRepository();

  async create(data: CreateUserInput): Promise<UserRecord> {
    const now = new Date();
    const rec: UserRecord = {
      id: this.randomId(),
      email: data.email,
      password_hash: data.passwordHash,
      salt: data.salt ?? null,
      created_at: now,
      updated_at: now,
      status: (data.status as any) || 'ACTIVE',
      verification_token: null,
      verification_expires_at: null,
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

  async createRefreshToken(data: any) { return this.refreshRepo.createRefreshToken(data); }
  async findRefreshTokenByHash(hash: string) { return this.refreshRepo.findRefreshTokenByHash(hash); }
  async revokeRefreshToken(id: string, reason?: string, replacementTokenId?: string | null) { return this.refreshRepo.revokeRefreshToken(id, reason, replacementTokenId); }

  private randomId(): string {
    const { randomBytes } = require('crypto');
    return randomBytes(16).toString('hex');
  }
}

function buildApp(repo: IUserRepository) {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  registerAuthRoutes(router as any, repo);
  app.use(router);
  return app;
}

describe('Auth refresh - expired and revoked scenarios', () => {
  const pwdSvc = new PasswordService({ keyLength: 32, saltBytes: 16 });
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...OLD_ENV };
  });

  it('returns 401 when refresh token is expired', async () => {
    process.env.JWT_REFRESH_TTL = '1s';
    const repo = new TestUserRepository();
    const app = buildApp(repo);
    const email = 'exp@example.com';
    const password = 'Str0ng!Pass1';
    const hash = await pwdSvc.hashPassword(password);
    await repo.create({ email, passwordHash: hash });

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    const rt = login.body.data.refreshToken as string;

    const now = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now + 2500);
    const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken: rt });
    spy.mockRestore();

    expect(refresh.status).toBe(401);
  });

  it('returns 401 when refresh token was revoked (logout)', async () => {
    const repo = new TestUserRepository();
    const app = buildApp(repo);
    const email = 'rev@example.com';
    const password = 'Str0ng!Pass1';
    const hash = await pwdSvc.hashPassword(password);
    await repo.create({ email, passwordHash: hash });

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    const access = login.body.data.accessToken as string;
    const rt = login.body.data.refreshToken as string;

    // revoke via logout endpoint
    const logout = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${access}`).send({ refreshToken: rt });
    expect(logout.status).toBe(200);

    const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken: rt });
    expect(refresh.status).toBe(401);
  });
});
