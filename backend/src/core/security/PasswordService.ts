/*
 * PasswordService - secure password hashing and verification using Node.js crypto.scrypt
 * - No sensitive data (passwords, hashes, salts) are ever logged
 * - Cost/work factors configurable via environment variables
 * - Hash format: $sc$N=<N>,r=<r>,p=<p>$<salt_b64>$<hash_b64>
 */

import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt) as (password: string | Buffer, salt: string | Buffer, keylen: number, options?: any) => Promise<Buffer>;

export type HashAlgorithm = 'scrypt'; // can be extended in future (e.g., 'bcrypt', 'argon2')

export interface PasswordHashConfig {
  algorithm?: HashAlgorithm; // default 'scrypt'
  // scrypt parameters
  scryptN?: number; // CPU/memory cost parameter (must be power of 2). Default 2^14 (16384)
  scryptR?: number; // block size parameter. Default 8
  scryptP?: number; // parallelization parameter. Default 1
  keyLength?: number; // number of bytes to derive. Default 64
  saltBytes?: number; // number of random salt bytes. Default 16
}

function envInt(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function resolveConfig(overrides?: PasswordHashConfig): Required<PasswordHashConfig> {
  const cfg: Required<PasswordHashConfig> = {
    algorithm: (overrides?.algorithm ?? (process.env.PASSWORD_HASH_ALGO as HashAlgorithm) ?? 'scrypt') as HashAlgorithm,
    scryptN: overrides?.scryptN ?? envInt('SCRYPT_N', 16384),
    scryptR: overrides?.scryptR ?? envInt('SCRYPT_R', 8),
    scryptP: overrides?.scryptP ?? envInt('SCRYPT_P', 1),
    keyLength: overrides?.keyLength ?? envInt('PASSWORD_KEY_LENGTH', 64),
    saltBytes: overrides?.saltBytes ?? envInt('PASSWORD_SALT_BYTES', 16),
  };
  return cfg;
}

function formatScryptHash(params: { N: number; r: number; p: number; salt: Buffer; hash: Buffer }): string {
  const saltB64 = params.salt.toString('base64');
  const hashB64 = params.hash.toString('base64');
  return `$sc$N=${params.N},r=${params.r},p=${params.p}$${saltB64}$${hashB64}`;
}

function parseScryptHash(hash: string): { N: number; r: number; p: number; salt: Buffer; hash: Buffer } | null {
  if (!hash.startsWith('$sc$')) return null;
  const parts = hash.split('$');
  // ['', 'sc', 'N=...,r=...,p=...', '<saltB64>', '<hashB64>']
  if (parts.length !== 5) return null;
  const paramsPart = parts[2];
  const saltPart = parts[3];
  const hashPart = parts[4];

  const match = /N=(\d+),r=(\d+),p=(\d+)/.exec(paramsPart);
  if (!match) return null;
  const N = parseInt(match[1], 10);
  const r = parseInt(match[2], 10);
  const p = parseInt(match[3], 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return null;

  try {
    const salt = Buffer.from(saltPart, 'base64');
    const hashBuf = Buffer.from(hashPart, 'base64');
    return { N, r, p, salt, hash: hashBuf };
  } catch {
    return null;
  }
}

export class PasswordService {
  private readonly config: Required<PasswordHashConfig>;

  constructor(config?: PasswordHashConfig) {
    this.config = resolveConfig(config);
    if (this.config.algorithm !== 'scrypt') {
      // Only scrypt is implemented with zero external dependencies
      this.config.algorithm = 'scrypt';
    }
  }

  // Hash a plain-text password and return a self-contained hash string
  async hashPassword(plainPassword: string): Promise<string> {
    if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
      throw new Error('Password is required');
    }

    // Scrypt implementation
    const salt = randomBytes(this.config.saltBytes);
    const key = await scrypt(plainPassword, salt, this.config.keyLength, {
      N: this.config.scryptN,
      r: this.config.scryptR,
      p: this.config.scryptP,
      maxmem: this.calculateMaxMem(),
    });

    return formatScryptHash({ N: this.config.scryptN, r: this.config.scryptR, p: this.config.scryptP, salt, hash: key });
  }

  // Verify a plain-text password against a stored hash string
  async verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
    if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
      return false;
    }
    if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
      return false;
    }

    // Parse scrypt formatted hash
    const parsed = parseScryptHash(passwordHash);
    if (!parsed) {
      // Unsupported or malformed hash format
      return false;
    }

    const derived = await scrypt(plainPassword, parsed.salt, parsed.hash.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
      maxmem: this.calculateMaxMem(),
    });

    if (derived.length !== parsed.hash.length) {
      return false;
    }

    return timingSafeEqual(derived, parsed.hash);
  }

  // Compute a conservative max memory to avoid DoS via extreme params.
  // Default: 256MB, configurable via PASSWORD_SCRYPT_MAXMEM (bytes)
  private calculateMaxMem(): number {
    const env = process.env.PASSWORD_SCRYPT_MAXMEM;
    const fallback = 256 * 1024 * 1024; // 256MB
    if (!env) return fallback;
    const n = parseInt(env, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
}

export default PasswordService;
