import { __resetHashProvidersForTests, __setHashProvidersForTests, hashPassword, verifyPassword, validatePasswordStrength, DEFAULT_PASSWORD_POLICY } from '../password.service';

// Simple base64-like encoder without Buffer to avoid needing @types/node in tests
function simpleEncode(s: string): string {
  // naive reversible encoding: hex of char codes joined by '-'
  return s
    .split('')
    .map((c) => c.charCodeAt(0).toString(16))
    .join('-');
}

// Create minimal fake providers to avoid external native deps
const fakeArgon2 = {
  // very naive hash which embeds random salt in the string
  async hash(plain: string, _options?: any): Promise<string> {
    const salt = Math.random().toString(36).slice(2, 10);
    return `$argon2id$${salt}$${simpleEncode(plain + ':' + salt)}`;
  },
  async verify(hash: string, plain: string): Promise<boolean> {
    if (!hash.startsWith('$argon2')) return false;
    const parts = hash.split('$');
    const salt = parts[2] || '';
    const expected = `$argon2id$${salt}$${simpleEncode(plain + ':' + salt)}`;
    return hash === expected;
  },
  argon2id: 2,
};

describe('password.service hashing and verification', () => {
  beforeAll(() => {
    __setHashProvidersForTests({ argon2: fakeArgon2 });
    process.env.PASSWORD_HASH_ALGO = 'argon2';
  });

  afterAll(() => {
    __resetHashProvidersForTests();
  });

  test('hashPassword produces non-deterministic hash and not equal to plaintext', async () => {
    const pwd = 'StrongPassw0rd!';
    const h1 = await hashPassword(pwd);
    const h2 = await hashPassword(pwd);

    expect(h1).not.toEqual(pwd);
    expect(h2).not.toEqual(pwd);
    expect(h1).not.toEqual(h2); // due to random salt
    expect(h1.startsWith('$argon2')).toBe(true);
  });

  test('verifyPassword returns true for correct password and false for wrong password', async () => {
    const pwd = 'AnotherGood1!';
    const hash = await hashPassword(pwd);

    await expect(verifyPassword(pwd, hash)).resolves.toBe(true);
    await expect(verifyPassword('bad-password', hash)).resolves.toBe(false);
  });
});

describe('validatePasswordStrength', () => {
  test('invalid: required', () => {
    const r = validatePasswordStrength('');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('password.required');
  });

  test('invalid: too short and missing classes', () => {
    const r = validatePasswordStrength('abc');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.startsWith('password.min_length_'))).toBe(true);
    expect(r.errors).toContain('password.min_uppercase_1');
    expect(r.errors).toContain('password.min_numbers_1');
    expect(r.errors).toContain('password.min_symbols_1');
  });

  test('invalid: spaces are forbidden', () => {
    const r = validatePasswordStrength('Abcdef1! withspace');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('password.no_spaces');
  });

  test('valid password meets default policy', () => {
    const valid = 'Aa12345678!';
    const r = validatePasswordStrength(valid, DEFAULT_PASSWORD_POLICY);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  test('custom policy detects missing lowercase', () => {
    const policy = { ...DEFAULT_PASSWORD_POLICY, minLowercase: 2 };
    const r = validatePasswordStrength('A123456789!', policy);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('password.min_lowercase_2');
  });
});
