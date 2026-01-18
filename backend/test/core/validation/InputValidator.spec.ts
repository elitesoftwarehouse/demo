import { InputValidator } from '../../../src/core/validation/InputValidator';

describe('InputValidator - email', () => {
  it('normalizes email to trimmed lowercase', () => {
    expect(InputValidator.normalizeEmail('  TeSt@Example.Com  ')).toBe('test@example.com');
  });

  it('valid email formats', () => {
    const valid = [
      'user@example.com',
      'name.surname@example.co',
      'user+tag@sub.domain.org',
    ];
    for (const e of valid) {
      expect(InputValidator.isValidEmail(e)).toBe(true);
    }
  });

  it('invalid email formats', () => {
    const invalid = [
      '',
      'plainaddress',
      'missing-at.example.com',
      'user@',
      '@domain.com',
      'user@domain', // missing tld
      'user@domain.',
      'user@.com',
      'user@domain.c', // tld too short
      'user name@example.com', // space
    ];
    for (const e of invalid) {
      expect(InputValidator.isValidEmail(e)).toBe(false);
    }
  });
});

describe('InputValidator - password policy', () => {
  it('rejects non-string', () => {
    // @ts-expect-error testing runtime behavior
    expect(InputValidator.validatePassword(undefined).valid).toBe(false);
  });

  it('rejects too short', () => {
    const res = InputValidator.validatePassword('Aa1!');
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('at least'))).toBe(true);
  });

  it('rejects missing required character classes', () => {
    expect(InputValidator.validatePassword('aaaaaaaa').valid).toBe(false); // no uppercase, number, symbol
    expect(InputValidator.validatePassword('AAAAAAAA').valid).toBe(false); // no lowercase, number, symbol
    expect(InputValidator.validatePassword('AAAAaaaa').valid).toBe(false); // no number, symbol
    expect(InputValidator.validatePassword('AAAAaaaa1').valid).toBe(false); // no symbol
  });

  it('accepts valid password', () => {
    const res = InputValidator.validatePassword('Valid1!Pass');
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('respects custom policy maxLength', () => {
    const long = 'A' + 'a1!'.repeat(100);
    const res = InputValidator.validatePassword(long, { maxLength: 50 });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.toLowerCase().includes('too long'))).toBe(true);
  });
});
