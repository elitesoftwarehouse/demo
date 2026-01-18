import { PasswordService } from '../../../src/core/security/PasswordService';

// Ensure no sensitive data is logged during tests

describe('PasswordService', () => {
  const svc = new PasswordService({ keyLength: 32, saltBytes: 16 });

  it('hashPassword should be non-deterministic and not equal to plaintext', async () => {
    const plain = 'Str0ng!Pass';
    const h1 = await svc.hashPassword(plain);
    const h2 = await svc.hashPassword(plain);

    expect(h1).not.toEqual(plain);
    expect(h2).not.toEqual(plain);
    expect(h1).not.toEqual(h2); // due to random salt

    // format: $sc$N=...,r=...,p=...$<salt>$<hash>
    expect(h1.startsWith('$sc$')).toBe(true);
    expect(h1.split('$').length).toBeGreaterThanOrEqual(5);
  });

  it('verifyPassword should return true for correct password and false for wrong one', async () => {
    const plain = 'An0ther!Pass';
    const hash = await svc.hashPassword(plain);

    await expect(svc.verifyPassword(plain, hash)).resolves.toBe(true);
    await expect(svc.verifyPassword('wrong-pass', hash)).resolves.toBe(false);
  });
});
