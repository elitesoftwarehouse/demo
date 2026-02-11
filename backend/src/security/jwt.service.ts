/**
 * JWT service (HS256) without external dependencies.
 * - Signs and verifies JSON Web Tokens for access and refresh flows
 * - Access token: short-lived
 * - Refresh token: long-lived, persisted as hash in DB
 *
 * Env vars
 * - JWT_SECRET: required secret for HMAC-SHA256
 * - JWT_ISSUER: optional issuer claim (iss)
 * - JWT_AUDIENCE: optional audience claim (aud)
 * - JWT_ACCESS_TTL: access token lifetime (e.g., "15m", "1h") default: 15m
 * - JWT_REFRESH_TTL: refresh token lifetime (e.g., "7d") default: 7d
 */

// Using require to avoid @types/node dependency
const crypto = require('crypto');

export interface JwtConfig {
  secret: string;
  issuer?: string;
  audience?: string;
  accessTtlSec: number;
  refreshTtlSec: number;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  roles?: string[]; // optional roles; may be empty
  iat?: number;
  nbf?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  [k: string]: any;
}

export interface SignedToken {
  token: string;
  expiresAt: Date;
}

function base64url(input: string | Uint8Array): string {
  const buff = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
  return buff.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64url(input: string): Buffer {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : '';
  return Buffer.from(b64 + pad, 'base64');
}

function hmacSha256(key: string, data: string): string {
  const sig = crypto.createHmac('sha256', key).update(data).digest();
  return base64url(sig);
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function parseDurationToSec(v: string | undefined, fallbackSec: number): number {
  if (!v || typeof v !== 'string') return fallbackSec;
  const s = v.trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const match = s.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return fallbackSec;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return fallbackSec;
  }
}

export function getJwtConfig(): JwtConfig {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  const issuer = (process.env.JWT_ISSUER || '').trim() || undefined;
  const audience = (process.env.JWT_AUDIENCE || '').trim() || undefined;
  const accessTtlSec = parseDurationToSec(process.env.JWT_ACCESS_TTL, 15 * 60); // 15m
  const refreshTtlSec = parseDurationToSec(process.env.JWT_REFRESH_TTL, 7 * 24 * 3600); // 7d
  return { secret, issuer, audience, accessTtlSec, refreshTtlSec };
}

export function signJwt(payload: JwtPayload, ttlSec: number, cfg?: Partial<JwtConfig>): SignedToken {
  const conf = cfg
    ? ({ ...getJwtConfig(), ...cfg } as JwtConfig)
    : getJwtConfig();
  const header = { alg: 'HS256', typ: 'JWT' } as const;
  const iat = nowSec();
  const exp = iat + ttlSec;
  const fullPayload: JwtPayload = {
    ...payload,
    iat,
    exp,
    ...(conf.issuer ? { iss: conf.issuer } : {}),
    ...(conf.audience ? { aud: conf.audience } : {}),
  };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = hmacSha256(conf.secret, signingInput);
  return { token: `${signingInput}.${signature}`, expiresAt: new Date(exp * 1000) };
}

export function verifyJwt(token: string, cfgOverride?: Partial<JwtConfig>): { valid: boolean; payload?: JwtPayload; error?: string } {
  try {
    const conf = cfgOverride ? ({ ...getJwtConfig(), ...cfgOverride } as JwtConfig) : getJwtConfig();
    const parts = (token || '').split('.');
    if (parts.length !== 3) return { valid: false, error: 'format' };
    const [h, p, s] = parts;
    const expectedSig = hmacSha256(conf.secret, `${h}.${p}`);
    if (s !== expectedSig) return { valid: false, error: 'signature' };
    const payload: JwtPayload = JSON.parse(fromBase64url(p).toString('utf8'));
    const now = nowSec();
    if (payload.nbf && now < payload.nbf) return { valid: false, error: 'nbf' };
    if (payload.exp && now >= payload.exp) return { valid: false, error: 'expired' };
    if (conf.issuer && payload.iss && payload.iss !== conf.issuer) return { valid: false, error: 'issuer' };
    if (conf.audience && payload.aud && payload.aud !== conf.audience) return { valid: false, error: 'audience' };
    return { valid: true, payload };
  } catch (_) {
    return { valid: false, error: 'invalid' };
  }
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = (token || '').split('.');
    if (parts.length < 2) return null;
    return JSON.parse(fromBase64url(parts[1]).toString('utf8')) as JwtPayload;
  } catch (_) {
    return null;
  }
}

export function signAccessToken(user: { id: string; email: string; roles?: string[] }): SignedToken {
  const cfg = getJwtConfig();
  return signJwt({ sub: user.id, email: user.email, roles: user.roles || [] }, cfg.accessTtlSec, cfg);
}

export function signRefreshToken(user: { id: string; email: string; roles?: string[] }): SignedToken {
  const cfg = getJwtConfig();
  return signJwt({ sub: user.id, email: user.email, roles: user.roles || [], typ: 'refresh' }, cfg.refreshTtlSec, cfg);
}

export function hashRefreshToken(token: string): string {
  // Store only SHA-256 hash of the refresh token
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
