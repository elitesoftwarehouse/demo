/**
 * Security service for password hashing and verification.
 *
 * Goals:
 * - Use a vetted KDF (argon2id preferred, fallback to bcrypt) with configurable cost via env vars
 * - Expose: hashPassword(plain), verifyPassword(plain, hash)
 * - Expose: validatePasswordStrength(password, policy?)
 * - NEVER log plaintext passwords or password hashes from here
 */

// Important: this module must not log any password or hash. No console.log here.

// Environment configuration helpers
function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const parsed = parseInt(v, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function envStr(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : fallback;
}

// Hashing algo selection: ARGON2 (default) or BCRYPT
const HASH_ALGO = envStr('PASSWORD_HASH_ALGO', 'argon2').toLowerCase();

// Argon2 configuration (values in line with common recommendations for server-side hashing)
const ARGON2_TIME_COST = envInt('ARGON2_TIME_COST', 3); // iterations
const ARGON2_MEMORY_KIB = envInt('ARGON2_MEMORY_KIB', 1 << 16); // 65536 KiB (~64 MiB)
const ARGON2_PARALLELISM = envInt('ARGON2_PARALLELISM', 1);

// Bcrypt configuration
const BCRYPT_COST = envInt('BCRYPT_COST', 12);

// Lazy holders for libraries to avoid hard dependency during static evaluation
let _argon2: any | null = null;
let _bcrypt: any | null = null;

async function getArgon2(): Promise<any> {
  if (_argon2) return _argon2;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _argon2 = require('argon2');
    return _argon2;
  } catch (_) {
    return null;
  }
}

async function getBcrypt(): Promise<any> {
  if (_bcrypt) return _bcrypt;
  try {
    // prefer bcrypt if installed, otherwise bcryptjs
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _bcrypt = require('bcrypt');
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _bcrypt = require('bcryptjs');
    }
    return _bcrypt;
  } catch (_) {
    return null;
  }
}

export interface PasswordPolicy {
  minLength?: number; // minimum number of characters
  minLowercase?: number; // a-z
  minUppercase?: number; // A-Z
  minNumbers?: number; // 0-9
  minSymbols?: number; // non-alphanumeric symbols
  forbidSpaces?: boolean; // typically true to avoid copy/paste issues
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export const DEFAULT_PASSWORD_POLICY: Required<PasswordPolicy> = {
  minLength: 10,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
  forbidSpaces: true,
};

/**
 * Validate the password against policy.
 * Returns a result with list of human-readable errors (keys in English to keep codebase consistent).
 */
export function validatePasswordStrength(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): PasswordValidationResult {
  const p: Required<PasswordPolicy> = { ...DEFAULT_PASSWORD_POLICY, ...policy } as any;
  const errors: string[] = [];

  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, errors: ['password.required'] };
  }

  if (password.length < p.minLength) {
    errors.push(`password.min_length_${p.minLength}`);
  }

  if (p.forbidSpaces && /\s/.test(password)) {
    errors.push('password.no_spaces');
  }

  const lc = (password.match(/[a-z]/g) || []).length;
  const uc = (password.match(/[A-Z]/g) || []).length;
  const num = (password.match(/[0-9]/g) || []).length;
  const sym = (password.match(/[^a-zA-Z0-9\s]/g) || []).length;

  if (lc < p.minLowercase) errors.push(`password.min_lowercase_${p.minLowercase}`);
  if (uc < p.minUppercase) errors.push(`password.min_uppercase_${p.minUppercase}`);
  if (num < p.minNumbers) errors.push(`password.min_numbers_${p.minNumbers}`);
  if (sym < p.minSymbols) errors.push(`password.min_symbols_${p.minSymbols}`);

  return { valid: errors.length === 0, errors };
}

/**
 * Hash a plaintext password using configured algorithm.
 * Note: do not log the plaintext or the resulting hash.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new Error('Invalid password input');
  }

  if (HASH_ALGO === 'bcrypt') {
    const bcrypt = await getBcrypt();
    if (!bcrypt) throw new Error('Bcrypt not available. Please install "bcrypt" or "bcryptjs"');
    const salt = await bcrypt.genSalt(BCRYPT_COST);
    const hash = await bcrypt.hash(plainPassword, salt);
    return hash;
  }

  const argon2 = await getArgon2();
  if (!argon2) throw new Error('Argon2 not available. Please install "argon2" or set PASSWORD_HASH_ALGO=bcrypt');

  const options = {
    type: argon2.argon2id || 2, // 2 is argon2id in the popular argon2 lib
    timeCost: ARGON2_TIME_COST,
    memoryCost: ARGON2_MEMORY_KIB,
    parallelism: ARGON2_PARALLELISM,
  };
  // argon2 lib generates a salt automatically if not provided
  const hash = await argon2.hash(plainPassword, options);
  return hash;
}

/**
 * Verify a plaintext password against a stored hash.
 * Supports either argon2 or bcrypt hashes depending on configuration/library.
 */
export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) return false;
  if (typeof passwordHash !== 'string' || passwordHash.length === 0) return false;

  // First try argon2 verify if library available and hash looks like argon2
  const isArgonHash = passwordHash.startsWith('$argon2');
  const argon2 = await getArgon2();
  if (argon2 && (HASH_ALGO === 'argon2' || isArgonHash)) {
    try {
      return await argon2.verify(passwordHash, plainPassword);
    } catch (_) {
      return false;
    }
  }

  // Fallback to bcrypt verify if available or if hash format matches bcrypt
  const isBcryptHash = passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$') || passwordHash.startsWith('$2y$');
  const bcrypt = await getBcrypt();
  if (bcrypt && (HASH_ALGO === 'bcrypt' || isBcryptHash)) {
    try {
      return await bcrypt.compare(plainPassword, passwordHash);
    } catch (_) {
      return false;
    }
  }

  // No suitable library found
  return false;
}

/**
 * Test-only hooks: allow injecting fake argon2/bcrypt providers for unit tests
 * without introducing external dependencies. Not for production use.
 */
export function __setHashProvidersForTests(providers: { argon2?: any; bcrypt?: any }): void {
  if (providers && 'argon2' in providers) {
    _argon2 = providers.argon2 || null;
  }
  if (providers && 'bcrypt' in providers) {
    _bcrypt = providers.bcrypt || null;
  }
}

export function __resetHashProvidersForTests(): void {
  _argon2 = null;
  _bcrypt = null;
}
