import { USER_SENSITIVE_FIELDS, userForLog, userToPublic, UserStatus, User } from '../user.model';

describe('user.model access helpers', () => {
  const baseUser: User = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'user@example.com',
    passwordHash: 'HASH',
    status: UserStatus.ACTIVE,
    verificationToken: 'TOKEN',
    verificationExpiresAt: new Date('2025-01-01T00:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  test('USER_SENSITIVE_FIELDS includes passwordHash and verificationToken', () => {
    expect(USER_SENSITIVE_FIELDS).toEqual(expect.arrayContaining(['passwordHash', 'verificationToken']));
  });

  test('userForLog redacts sensitive fields but preserves others', () => {
    const redacted = userForLog(baseUser);
    expect((redacted as any).passwordHash).toBe('[REDACTED]');
    expect((redacted as any).verificationToken).toBe('[REDACTED]');
    expect(redacted.email).toBe(baseUser.email);
    expect(redacted.id).toBe(baseUser.id);
  });

  test('userToPublic removes sensitive fields', () => {
    const pub = userToPublic(baseUser);
    expect((pub as any).passwordHash).toBeUndefined();
    expect((pub as any).verificationToken).toBeUndefined();
    expect((pub as any).email).toBe(baseUser.email);
  });
});
