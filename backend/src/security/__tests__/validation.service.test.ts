import { normalizeEmail, validateEmail, validatePassword } from '../validation.service';

// Password validation is delegated; here we just check the bridge

describe('validation.service - email', () => {
  test('normalizeEmail trims and lowercases', () => {
    expect(normalizeEmail('  Foo.Bar+tag@Example.COM  ')).toBe('foo.bar+tag@example.com');
  });

  test('validateEmail - valid formats', () => {
    const emails = [
      'user@example.com',
      'USER@EXAMPLE.COM',
      'first.last+alias@sub.domain.co',
      'name_surname-123@domain.io',
    ];
    for (const e of emails) {
      const res = validateEmail(e);
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe(e.trim().toLowerCase());
    }
  });

  test('validateEmail - invalid formats', () => {
    const invalids = ['', '   ', 'no-at-symbol', 'user@', '@domain.com', 'user@domain', 'user@domain.'];
    for (const e of invalids) {
      const res = validateEmail(e);
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    }
  });
});

describe('validation.service - password delegator', () => {
  test('validatePassword delegates to password.service', () => {
    const res = validatePassword('Aa12345678!');
    expect(typeof res.valid).toBe('boolean');
    expect(Array.isArray(res.errors)).toBe(true);
  });
});
