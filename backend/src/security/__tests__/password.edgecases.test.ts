import { __resetHashProvidersForTests, __setHashProvidersForTests, hashPassword, verifyPassword } from '../password.service';

// declare jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

// Fake argon2 provider used to avoid native deps
function simpleEncode(s: string): string {
  return s
    .split('')
    .map((c) => c.charCodeAt(0).toString(16))
    .join('-');
}
const fakeArgon2 = {
  async hash(plain: string): Promise<string> {
    const salt = 'salt';
    return `$argon2id$${salt}$${simpleEncode(plain + ':' + salt)}`;
  },
  async verify(hash: string, plain: string): Promise<boolean> {
    if (!hash.startsWith('$argon2')) return false;
    const salt = 'salt';
    const expected = `$argon2id$${salt}$${simpleEncode(plain + ':' + salt)}`;
    return hash === expected;
  },
  argon2id: 2,
};

describe('password.service - edge cases', () => {
  beforeAll(() => {
    __setHashProvidersForTests({ argon2: fakeArgon2 });
    process.env.PASSWORD_HASH_ALGO = 'argon2';
  });
  afterAll(() => {
    __resetHashProvidersForTests();
  });

  test('verifyPassword returns false for null/empty/plain mismatch', async () => {
    const hash = await hashPassword('StrongP@ss1');
    expect(await verifyPassword('', hash)).toBe(false);
    expect(await verifyPassword('   ', hash)).toBe(false);
    expect(await verifyPassword('wrong', hash)).toBe(false);
    expect(await verifyPassword(null as any, hash)).toBe(false);
  });

  test('hashPassword never equals plaintext and is non-deterministic across calls', async () => {
    const h1 = await hashPassword('StrongP@ss1');
    const h2 = await hashPassword('StrongP@ss1');
    expect(h1).not.toBe('StrongP@ss1');
    expect(h1).not.toBe(h2);
  });
});
