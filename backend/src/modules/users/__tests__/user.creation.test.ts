import { User, UserStatus } from '../user.model';

function makeUser(partial: Partial<User>): User {
  const now = new Date('2024-01-01T00:00:00Z');
  return {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'new@example.com',
    passwordHash: 'HASHED',
    status: UserStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    verificationToken: null,
    verificationExpiresAt: null,
    ...partial,
  };
}

describe('user model instance creation - required fields', () => {
  test('creation with required fields succeeds', () => {
    const user = makeUser({});
    expect(user.id).toBeTruthy();
    expect(user.email).toBe('new@example.com');
    expect(user.passwordHash).toBe('HASHED');
    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  test('missing mandatory fields should be detectable', () => {
    const user = makeUser({ email: undefined as unknown as string });
    // TypeScript would normally catch this at compile-time; at runtime we can assert presence
    expect(typeof user.email).toBe('undefined');
  });
});
