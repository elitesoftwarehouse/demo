import { AuthService } from '../../../src/modules/auth/service/AuthService';
import type { IUserRepository, CreateUserInput, UserRecord } from '../../../src/modules/user/repository/UserRepository';
import { PasswordService } from '../../../src/core/security/PasswordService';

class InMemoryRepo implements IUserRepository {
  items: UserRecord[] = [];
  async create(data: CreateUserInput): Promise<UserRecord> {
    const now = new Date();
    const rec: UserRecord = {
      id: 'u-' + Math.random().toString(36).slice(2),
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
    return this.items.find((i) => i.email === email) || null;
  }
}

describe('AuthService - password verify and edge cases', () => {
  const pwd = new PasswordService({ keyLength: 32, saltBytes: 16 });

  it('fails when user does not exist', async () => {
    const repo = new InMemoryRepo();
    const svc = new AuthService(repo, pwd as any);
    await expect(svc.login({ email: 'missing@example.com', password: 'Xx1!xxxx' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('fails when password is empty/null', async () => {
    const repo = new InMemoryRepo();
    const svc = new AuthService(repo, pwd as any);
    // empty password triggers BAD_REQUEST
    await expect(svc.login({ email: 'a@b.com', password: '' } as any)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    // null password also BAD_REQUEST
    await expect(svc.login({ email: 'a@b.com', password: null as any })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('fails when account disabled', async () => {
    const repo = new InMemoryRepo();
    const svc = new AuthService(repo, pwd as any);
    const hash = await pwd.hashPassword('Str0ng!Pass1');
    await repo.create({ email: 'blocked@example.com', passwordHash: hash, status: 'DISABLED' });

    await expect(svc.login({ email: 'blocked@example.com', password: 'Str0ng!Pass1' })).rejects.toMatchObject({ code: 'LOCKED' });
  });

  it('succeeds with correct credentials', async () => {
    const repo = new InMemoryRepo();
    const svc = new AuthService(repo, pwd as any);
    const hash = await pwd.hashPassword('Str0ng!Pass1');
    await repo.create({ email: 'ok@example.com', passwordHash: hash, status: 'ACTIVE' });

    const res = await svc.login({ email: 'ok@example.com', password: 'Str0ng!Pass1' });
    expect(res).toHaveProperty('accessToken');
    expect(res).toHaveProperty('refreshToken');
    expect(res.tokenType).toBe('Bearer');
  });
});
