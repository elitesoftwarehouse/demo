import * as express from 'express';
const request = require('supertest');
import { registerAuthRoutes } from '../../../../src/modules/user/http/routes';
import type { CreateUserInput, IUserRepository, UserRecord } from '../../../../src/modules/user/repository/UserRepository';
import { PasswordService } from '../../../../src/core/security/PasswordService';

// Simple in-memory repository for login tests
class TestUserRepository implements IUserRepository {
  private items: UserRecord[] = [];

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

  private randomId(): string {
    const { randomBytes } = require('crypto');
    const b = randomBytes(16);
    const hex = b.toString('hex');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  }
}

describe('Auth Login API', () => {
  const app = express();
  app.use(express.json());
  const repo = new TestUserRepository();
  app.use('/', registerAuthRoutes(express.Router(), repo));

  const pwdSvc = new PasswordService({ keyLength: 32, saltBytes: 16 });

  beforeAll(async () => {
    const { hash } = await pwdSvc.hash('Str0ng!Pass1');
    await repo.create({ email: 'login@example.com', passwordHash: hash });
  });

  it('returns 400 for invalid input', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for wrong credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'Wrong!Pass' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with tokens for correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'Str0ng!Pass1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data).toHaveProperty('tokenType', 'Bearer');
    expect(res.body.data).toHaveProperty('expiresIn');
    expect(res.body.data).toHaveProperty('user');
  });
});
