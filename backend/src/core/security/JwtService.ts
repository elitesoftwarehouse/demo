/*
 * JwtService - minimal JWT (HS256) creation and refresh token generation
 * - No external deps; uses Node crypto
 * - Access token: JWT signed with HS256
 * - Refresh token: cryptographically random opaque token; only HMAC-SHA256 hash stored
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface JwtServiceConfig {
  issuer?: string;
  audience?: string;
  accessSecret?: string; // HS256 secret
  refreshSecret?: string; // used to HMAC-hash refresh tokens
  accessTtl?: string | number; // e.g., '15m' or seconds number
  refreshTtl?: string | number; // e.g., '30d' or seconds number
  refreshBytes?: number; // default 64
}

export interface AccessTokenResult {
  token: string;
  expiresIn: number; // seconds
  expiresAt: Date;
}

export interface RefreshTokenResult {
  token: string; // plaintext token to return to client
  hash: string; // HMAC-SHA256(base64url) digest to persist
  issuedAt: Date;
  expiresAt: Date;
  familyId: string; // random id to group tokens (rotation)
}

function base64url(input: Buffer | string): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(input: string): Buffer {
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64');
}

function parseDurationToSeconds(val: string | number | undefined, fallback: number): number {
  if (typeof val === 'number' && isFinite(val) && val > 0) return Math.floor(val);
  const raw = (val as string) || '';
  if (!raw) return fallback;
  const m = /^([0-9]+)\s*([smhd])?$/.exec(raw.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 10);
  const unit = (m[2] || 's') as 's' | 'm' | 'h' | 'd';
  const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return n * mult;
}

function envOr(name: string, def: string): string {
  const v = process.env[name];
  return (v && v.length > 0) ? v : def;
}

function tokenError(code: string, message: string): any {
  const err: any = new Error(message);
  err.code = code;
  return err;
}

export class JwtService {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtlSec: number;
  private readonly refreshTtlSec: number;
  private readonly refreshBytes: number;

  constructor(cfg?: JwtServiceConfig) {
    this.issuer = cfg?.issuer ?? envOr('JWT_ISSUER', 'smartdesk');
    this.audience = cfg?.audience ?? envOr('JWT_AUDIENCE', 'smartdesk-pwa');
    this.accessSecret = cfg?.accessSecret ?? envOr('JWT_ACCESS_SECRET', 'change-me-access-secret');
    this.refreshSecret = cfg?.refreshSecret ?? envOr('JWT_REFRESH_SECRET', 'change-me-refresh-secret');
    this.accessTtlSec = parseDurationToSeconds(cfg?.accessTtl ?? process.env.JWT_ACCESS_TTL ?? '900', 900);
    this.refreshTtlSec = parseDurationToSeconds(cfg?.refreshTtl ?? process.env.JWT_REFRESH_TTL ?? '2592000', 30 * 24 * 3600);
    this.refreshBytes = cfg?.refreshBytes ?? (parseInt(process.env.REFRESH_TOKEN_BYTES || '64', 10) || 64);
  }

  signAccessToken(subject: string, email: string, roles?: string[]): AccessTokenResult {
    const header = { alg: 'HS256', typ: 'JWT' };
    const nowSec = Math.floor(Date.now() / 1000);
    const exp = nowSec + this.accessTtlSec;
    const payload: any = {
      sub: subject,
      email,
      roles: roles && roles.length > 0 ? roles : undefined,
      iss: this.issuer,
      aud: this.audience,
      iat: nowSec,
      exp,
      ver: 1,
    };

    const encHeader = base64url(JSON.stringify(header));
    const encPayload = base64url(JSON.stringify(payload));
    const signingInput = `${encHeader}.${encPayload}`;
    const sig = createHmac('sha256', this.accessSecret).update(signingInput).digest();
    const jwt = `${signingInput}.${base64url(sig)}`;

    return { token: jwt, expiresIn: this.accessTtlSec, expiresAt: new Date(exp * 1000) };
  }

  generateRefreshToken(): RefreshTokenResult {
    const rnd = randomBytes(this.refreshBytes);
    const token = base64url(rnd);
    const issuedAt = new Date();
    const expiresAt = new Date(Date.now() + this.refreshTtlSec * 1000);
    const familyId = base64url(randomBytes(16));
    const hash = this.hashRefreshToken(token);
    return { token, hash, issuedAt, expiresAt, familyId };
  }

  hashRefreshToken(token: string): string {
    const mac = createHmac('sha256', this.refreshSecret).update(token).digest();
    return base64url(mac);
  }

  // Verify an access token: validates structure, signature, iss/aud, and expiration
  verifyAccessToken(token: string): any {
    if (typeof token !== 'string' || token.split('.').length !== 3) {
      throw tokenError('TOKEN_MALFORMED', 'Malformed token');
    }

    const [h, p, s] = token.split('.');
    try {
      const headerJson = base64urlDecode(h).toString('utf8');
      const payloadJson = base64urlDecode(p).toString('utf8');
      const header = JSON.parse(headerJson);
      const payload = JSON.parse(payloadJson);

      if (header?.alg !== 'HS256') {
        throw tokenError('TOKEN_UNSUPPORTED_ALG', 'Unsupported algorithm');
      }

      const signingInput = `${h}.${p}`;
      const expectedSig = createHmac('sha256', this.accessSecret).update(signingInput).digest();
      const actualSig = base64urlDecode(s);
      if (actualSig.length !== expectedSig.length || !timingSafeEqual(actualSig, expectedSig)) {
        throw tokenError('TOKEN_INVALID_SIGNATURE', 'Invalid token signature');
      }

      // Validate claims
      if (payload?.iss !== this.issuer) {
        throw tokenError('TOKEN_INVALID_ISSUER', 'Invalid token issuer');
      }
      if (payload?.aud !== this.audience) {
        throw tokenError('TOKEN_INVALID_AUDIENCE', 'Invalid token audience');
      }

      const nowSec = Math.floor(Date.now() / 1000);
      if (typeof payload?.exp !== 'number' || nowSec >= payload.exp) {
        throw tokenError('TOKEN_EXPIRED', 'Token expired');
      }
      // iat check must be a number and not too far in the future
      if (typeof payload?.iat !== 'number') {
        throw tokenError('TOKEN_INVALID_IAT', 'Invalid token iat');
      }
      // Optional: allow small clock skew (e.g., 60s)
      if (payload.iat > nowSec + 60) {
        throw tokenError('TOKEN_INVALID_IAT', 'Token iat in the future');
      }
      // Optional: nbf check
      if (typeof payload?.nbf === 'number' && nowSec < payload.nbf) {
        throw tokenError('TOKEN_NOT_YET_VALID', 'Token not yet valid');
      }

      return payload;
    } catch (e: any) {
      if (e?.code) throw e; // preserve structured token errors
      throw tokenError('TOKEN_INVALID', 'Invalid token');
    }
  }
}

export default JwtService;
