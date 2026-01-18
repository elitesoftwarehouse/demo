import * as express from 'express';
const request = require('supertest');
import { registerAuthRoutes } from '../../../../src/modules/user/http/routes';
import type { CreateUserInput, IUserRepository, UserRecord } from '../../../../src/modules/user/repository/UserRepository';

// Simple in-memory repository tailored for integration tests
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

  count(): number {
    return this.items.length;
  }

  countByEmail(email: string): number {
    return this.items.filter((u) => u.email === email).length;
  }

  private randomId(): string {
    const b = require('crypto').randomBytes(16);
    const arr = new Uint8Array(b);
    const hex = Array.from(arr).map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
  }
}

// Repo that simulates a DB error on create
class ErroringRepo implements IUserRepository {
  async create(_: CreateUserInput): Promise<UserRecord> {
    throw new Error('DB unavailable');
  }
  async findByEmail(_: string): Promise<UserRecord | null> {
    return null;
  }
}

function buildApp(repo: IUserRepository) {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  registerAuthRoutes(router as any, repo);
  app.use('/', router as any);
  return app;
}

describe('E2E - POST /api/auth/signup', () => {
  it('returns 201 and creates user with hashed password', async () => {
    const repo = new TestUserRepository();
    const app = buildApp(repo);

    const payload = { email: 'user@example.com', password: 'Str0ng!Pass' };

    const res = await request(app).post('/api/auth/signup').send(payload).expect(201);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    const data = res.body.data as any;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email', 'user@example.com');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('updatedAt');

    // Sensitive fields must not be present
    expect(Object.keys(data)).not.toContain('password');
    expect(Object.keys(data)).not.toContain('passwordHash');
    expect(Object.keys(data)).not.toContain('salt');

    // Verify persisted record exists with hashed password not equal to plaintext
    const rec = await repo.findByEmail('user@example.com');
    expect(rec).not.toBeNull();
    expect(rec!.password_hash).toBeTruthy();
    expect(rec!.password_hash).not.toEqual(payload.password);
    expect(repo.count()).toBe(1);
    expect(repo.countByEmail('user@example.com')).toBe(1);
  });

  it('returns 409 for duplicate email and does not create another user', async () => {
    const repo = new TestUserRepository();
    const app = buildApp(repo);

    const payload = { email: 'dup@example.com', password: 'An0ther!Pass' };

    await request(app).post('/api/auth/signup').send(payload).expect(201);
    const before = repo.count();

    const res = await request(app).post('/api/auth/signup').send(payload).expect(409);
    expect(res.body).toEqual({ success: false, error: { message: 'Email already registered' } });

    const after = repo.count();
    expect(after).toBe(before); // no new user created
    expect(repo.countByEmail(payload.email)).toBe(1);
  });

  it('returns 400 for missing or incomplete payload', async () => {
    const repo = new TestUserRepository();
    const app = buildApp(repo);

    // Missing both
    let res = await request(app).post('/api/auth/signup').send({}).expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('message', 'Invalid input');
    expect(Array.isArray(res.body.error.details)).toBe(true);

    // Missing password
    res = await request(app).post('/api/auth/signup').send({ email: 'user@example.com' }).expect(400);
    expect(res.body.error.message).toBe('Invalid input');

    // Missing email
    res = await request(app).post('/api/auth/signup').send({ password: 'Str0ng!Pass' }).expect(400);
    expect(res.body.error.message).toBe('Invalid input');
  });

  it('returns 400 for invalid email or weak password per policy', async () => {
    const repo = new TestUserRepository();
    const app = buildApp(repo);

    // invalid email
    let res = await request(app).post('/api/auth/signup').send({ email: 'invalid-email', password: 'Str0ng!Pass' }).expect(400);
    expect(res.body.error.message).toBe('Invalid input');

    // weak password (no uppercase, no number, no symbol)
    res = await request(app).post('/api/auth/signup').send({ email: 'valid@example.com', password: 'weakpass' }).expect(400);
    expect(res.body.error.message).toBe('Invalid input');
  });

  it('does not expose sensitive fields in response', async () => {
    const repo = new TestUserRepository();
    const app = buildApp(repo);

    const res = await request(app).post('/api/auth/signup').send({ email: 'safe@example.com', password: 'Str0ng!Pass' }).expect(201);
    const data = res.body.data as any;

    expect(data.password).toBeUndefined();
    expect(data.passwordHash).toBeUndefined();
    expect(data.salt).toBeUndefined();
  });

  it('returns 500 when DB error occurs', async () => {
    const app = buildApp(new ErroringRepo());

    const res = await request(app).post('/api/auth/signup').send({ email: 'err@example.com', password: 'Str0ng!Pass' }).expect(500);
    expect(res.body).toEqual({ success: false, error: { message: 'Internal server error' } });
  });
});
