import { User, AccountStatus } from '../../../../src/modules/user/domain/entities/User';

describe('User domain entity', () => {
  it('creates instance from persistence and toJSONSafe excludes sensitive fields', () => {
    const rec = {
      id: 'uuid-1234',
      email: 'user@example.com',
      password_hash: 'hash',
      salt: 'salt',
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-02T00:00:00Z'),
      status: 'ACTIVE' as const,
      verification_token: 'token',
      verification_expires_at: new Date('2024-01-03T00:00:00Z'),
    };

    const user = User.fromPersistence(rec as any);

    expect(user.id).toBe(rec.id);
    expect(user.email).toBe(rec.email);
    expect(user.status).toBe(AccountStatus.ACTIVE);

    const safe = user.toJSONSafe();
    expect(safe).toHaveProperty('id', rec.id);
    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe).not.toHaveProperty('salt');
    expect(safe).not.toHaveProperty('verificationToken');
    expect(safe).not.toHaveProperty('verificationExpiresAt');
  });

  it('fromPersistence handles missing optional fields', () => {
    const rec = {
      id: 'uuid-5678',
      email: 'user2@example.com',
      password_hash: 'hash',
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-02T00:00:00Z'),
      status: 'PENDING_VERIFICATION' as const,
    };

    const user = User.fromPersistence(rec as any);

    expect(user.salt).toBeNull();
    expect(user.verificationToken).toBeNull();
    expect(user.verificationExpiresAt).toBeNull();
  });
});
