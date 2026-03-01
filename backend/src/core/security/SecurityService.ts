// SecurityService: password hashing and input validation utilities
// IMPORTANT: Never log plain passwords or password hashes

import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(_scrypt);

// Configurable parameters via environment variables with safe defaults
const SCRYPT_N = Number.parseInt(process.env.SECURITY_SCRYPT_N || process.env.SCRYPT_N || '16384', 10); // 2^14
const SCRYPT_r = Number.parseInt(process.env.SECURITY_SCRYPT_r || process.env.SCRYPT_r || '8', 10);
const SCRYPT_p = Number.parseInt(process.env.SECURITY_SCRYPT_p || process.env.SCRYPT_p || '1', 10);
const SCRYPT_KEYLEN = Number.parseInt(process.env.SECURITY_SCRYPT_KEYLEN || process.env.SCRYPT_KEYLEN || '64', 10);
const SCRYPT_MAXMEM = Number.parseInt(process.env.SECURITY_SCRYPT_MAXMEM || process.env.SCRYPT_MAXMEM || `${128 * 1024 * 1024}`, 10); // 128MB

// Password policy (overridable via env)
const MIN_LENGTH = Number.parseInt(process.env.SECURITY_PASSWORD_MIN_LENGTH || process.env.PASSWORD_MIN_LENGTH || '12', 10);
const REQUIRE_UPPER = (process.env.SECURITY_PASSWORD_REQUIRE_UPPER || 'true') === 'true';
const REQUIRE_LOWER = (process.env.SECURITY_PASSWORD_REQUIRE_LOWER || 'true') === 'true';
const REQUIRE_DIGIT = (process.env.SECURITY_PASSWORD_REQUIRE_DIGIT || 'true') === 'true';
const REQUIRE_SYMBOL = (process.env.SECURITY_PASSWORD_REQUIRE_SYMBOL || 'true') === 'true';
const DISALLOW_SPACES = (process.env.SECURITY_PASSWORD_DISALLOW_SPACES || 'true') === 'true';

export type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

export type EmailValidationResult = {
  isValid: boolean;
  normalized: string | null;
  error?: string;
};

// Hash format: scrypt$N$r$p$saltBase64$hashBase64
const HASH_SCHEME_PREFIX = 'scrypt';

export const SecurityService = Object.freeze({
  // Hash a plain password with scrypt. Returns a single safe string to store.
  async hashPassword(plainPassword: string): Promise<string> {
    if (typeof plainPassword !== 'string') {
      throw new Error('Password must be a string');
    }
    const salt = randomBytes(16).toString('base64');
    const derived = (await scrypt(plainPassword, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_N,
      r: SCRYPT_r,
      p: SCRYPT_p,
      maxmem: SCRYPT_MAXMEM,
    })) as Buffer;

    const hash = Buffer.from(derived).toString('base64');
    return `${HASH_SCHEME_PREFIX}$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt}$${hash}`;
  },

  // Verify a plain password against a stored hash string
  async verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
    if (!passwordHash || typeof passwordHash !== 'string') return false;

    const parts = passwordHash.split('$');
    if (parts.length !== 6 || parts[0] !== HASH_SCHEME_PREFIX) return false;

    const [, Nstr, rStr, pStr, salt, storedHashB64] = parts;
    const N = Number.parseInt(Nstr, 10);
    const r = Number.parseInt(rStr, 10);
    const p = Number.parseInt(pStr, 10);

    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p) || !salt || !storedHashB64) {
      return false;
    }

    const derived = (await scrypt(plainPassword, salt, Buffer.from(storedHashB64, 'base64').length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    })) as Buffer;

    const computed = Buffer.from(derived);
    const stored = Buffer.from(storedHashB64, 'base64');

    // constant-time comparison
    if (computed.length !== stored.length) return false;
    return timingSafeEqual(computed, stored);
  },

  // Validate password strength based on the policy
  validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (typeof password !== 'string' || password.length === 0) {
      errors.push('La password è obbligatoria.');
      return { valid: false, errors };
    }

    if (password.length < MIN_LENGTH) {
      errors.push(`La password deve contenere almeno ${MIN_LENGTH} caratteri.`);
    }

    if (DISALLOW_SPACES && /\s/.test(password)) {
      errors.push('La password non può contenere spazi.');
    }

    if (REQUIRE_UPPER && !/[A-Z]/.test(password)) {
      errors.push('La password deve includere almeno una lettera maiuscola.');
    }

    if (REQUIRE_LOWER && !/[a-z]/.test(password)) {
      errors.push('La password deve includere almeno una lettera minuscola.');
    }

    if (REQUIRE_DIGIT && !/[0-9]/.test(password)) {
      errors.push('La password deve includere almeno una cifra.');
    }

    if (REQUIRE_SYMBOL && !/[~!@#$%^&*()_+\-=[\]{};':",.<>/?`|\\]/.test(password)) {
      errors.push('La password deve includere almeno un carattere speciale.');
    }

    // Basic check against simple repeats or sequences
    if (/(.)\1{2,}/.test(password)) {
      errors.push('La password non deve contenere caratteri ripetuti in modo eccessivo.');
    }

    // Very common weak passwords blacklist (minimal set)
    const weakList = new Set([
      'password',
      '123456',
      '123456789',
      'qwerty',
      'abc123',
      '111111',
      '12345678',
      'password1',
      '12345',
      'admin',
    ]);
    if (weakList.has(password.toLowerCase())) {
      errors.push('La password è troppo comune e facilmente indovinabile.');
    }

    return { valid: errors.length === 0, errors };
  },

  // Normalize and validate email using a basic RFC-like check
  normalizeAndValidateEmail(emailRaw: string): EmailValidationResult {
    if (typeof emailRaw !== 'string') {
      return { isValid: false, normalized: null, error: 'Email non valida.' };
    }

    const normalized = emailRaw.trim().toLowerCase();

    // Basic sanity checks
    if (normalized.length < 3 || normalized.length > 320) {
      return { isValid: false, normalized: null, error: 'Formato email non valido.' };
    }

    // Basic regex: local@domain.tld (with at least 2 chars TLD)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(normalized)) {
      return { isValid: false, normalized: null, error: 'Formato email non valido.' };
    }

    const [local, domain] = normalized.split('@');
    if (!local || !domain) {
      return { isValid: false, normalized: null, error: 'Formato email non valido.' };
    }

    // Disallow consecutive dots and leading/trailing dots in local part
    if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
      return { isValid: false, normalized: null, error: 'Formato email non valido.' };
    }

    // Domain minimal checks
    if (domain.startsWith('-') || domain.endsWith('-') || domain.includes('..')) {
      return { isValid: false, normalized: null, error: 'Formato email non valido.' };
    }

    return { isValid: true, normalized };
  },
});

export type SecurityServiceType = typeof SecurityService;
