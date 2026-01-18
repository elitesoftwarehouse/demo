import * as express from 'express';
const request = require('supertest');
import { registerAuthRoutes } from '../../../../src/modules/user/http/routes';
import type { CreateUserInput, IUserRepository, UserRecord } from '../../../../src/modules/user/repository/UserRepository';
import { PasswordService } from '../../../../src/core/security/PasswordService';

class TestUserRepository implements IUserRepository {
  private items: UserRecord[] = [];
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
  private randomId(): string {
    const { randomBytes } = require('crypto');
    const b = randomBytes(16);
    return b.toString('hex');
  }
}

describe('Auth Login API - edge cases', () => {
  const app = express();
  app.use(express.json());
  const repo = new TestUserRepository();
  app.use('/', registerAuthRoutes(express.Router(), repo));

  const pwdSvc = new PasswordService({ keyLength: 32, saltBytes: 16 });

  beforeAll(async () => {
    const hash = await pwdSvc.hashPassword('Str0ng!Pass1');
    await repo.create({ email: 'disabled@example.com', passwordHash: hash, status: 'DISABLED' });
  });

  it('returns 401 on non-existing email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nope@example.com', password: 'Str0ng!Pass1' });
    expect(res.status).toBe(401);
  });

  it('returns 423 for disabled account', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'disabled@example.com', password: 'Str0ng!Pass1' });
    expect(res.status).toBe(423);
  });

  it('returns 400 for invalid payload shapes', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: '' });
    expect(res.status).toBe(400);
  });
});
