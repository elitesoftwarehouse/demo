// JWTService: minimal JWT creation and verification without external dependencies
// HS256 only, using Node crypto HMAC. Base64url per RFC 7515.
// DO NOT log secrets or full tokens in production logs.

import { createHmac, timingSafeEqual } from 'node:crypto';

// Environment/configuration
const JWT_SECRET = (process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || '').trim();
const JWT_ISSUER = (process.env.AUTH_JWT_ISS || process.env.JWT_ISS || process.env.APP_NAME || 'smartdesk').trim();
const DEFAULT_ALG = 'HS256' as const;

// Small util to base64url encode/decode
function b64urlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecodeToBuffer(input: string): Buffer {
  const pad = 4 - (input.length % 4);
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + (pad === 4 ? '' : '='.repeat(pad));
  return Buffer.from(normalized, 'base64');
}

export type JWTHeader = {
  alg: 'HS256';
  typ: 'JWT';
  kid?: string;
};

export type JWTPayload = {
  sub?: string; // user id
  iss?: string;
  aud?: string | string[];
  exp?: number; // seconds since epoch
  nbf?: number; // seconds since epoch
  iat?: number; // seconds since epoch
  jti?: string;
  roles?: string[]; // optional roles for authorization
  [claim: string]: any;
};

export type VerifyResult = {
  valid: boolean;
  payload?: JWTPayload;
  header?: JWTHeader;
  code?: 'MISSING_TOKEN' | 'MALFORMED' | 'INVALID_SIGNATURE' | 'EXPIRED' | 'NOT_YET_VALID' | 'INVALID' | 'REVOKED';
  error?: string;
};

export type SignOptions = {
  expiresInSec?: number; // default e.g. 900 (15m) for access tokens
  issuer?: string;
  audience?: string | string[];
  subject?: string;
  jwtid?: string;
};

function ensureSecret(): string {
  if (!JWT_SECRET) {
    throw new Error('JWT secret non configurata. Impostare AUTH_JWT_SECRET o JWT_SECRET.');
  }
  return JWT_SECRET;
}

function signHMACSHA256(data: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(data).digest();
}

export const JWTService = Object.freeze({
  // Sign a payload with HS256
  sign(payload: JWTPayload, opts: SignOptions = {}): string {
    const nowSec = Math.floor(Date.now() / 1000);
    const header: JWTHeader = { alg: DEFAULT_ALG, typ: 'JWT' };
    const completePayload: JWTPayload = {
      iat: nowSec,
      iss: opts.issuer || JWT_ISSUER,
      aud: opts.audience,
      sub: opts.subject || payload.sub,
      jti: opts.jwtid || payload.jti,
      ...payload,
    };

    if (opts.expiresInSec && !completePayload.exp) {
      completePayload.exp = nowSec + opts.expiresInSec;
    }

    const encHeader = b64urlEncode(JSON.stringify(header));
    const encPayload = b64urlEncode(JSON.stringify(completePayload));
    const signingInput = `${encHeader}.${encPayload}`;
    const signature = signHMACSHA256(signingInput, ensureSecret());
    const encSig = b64urlEncode(signature);
    return `${signingInput}.${encSig}`;
  },

  // Verify HS256 token: signature, nbf, exp
  verify(token: string): VerifyResult {
    if (!token || typeof token !== 'string') {
      return { valid: false, code: 'MISSING_TOKEN', error: 'Token mancante.' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, code: 'MALFORMED', error: 'Token malformato.' };
    }

    let header: JWTHeader;
    let payload: JWTPayload;

    try {
      header = JSON.parse(b64urlDecodeToBuffer(parts[0]).toString('utf8')) as JWTHeader;
      payload = JSON.parse(b64urlDecodeToBuffer(parts[1]).toString('utf8')) as JWTPayload;
    } catch (e) {
      return { valid: false, code: 'MALFORMED', error: 'Token non valido.' };
    }

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      return { valid: false, code: 'INVALID', error: 'Algoritmo non supportato.' };
    }

    const signingInput = `${parts[0]}.${parts[1]}`;
    const expected = signHMACSHA256(signingInput, ensureSecret());
    const provided = b64urlDecodeToBuffer(parts[2]);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      return { valid: false, code: 'INVALID_SIGNATURE', error: 'Firma non valida.' };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.nbf === 'number' && nowSec < payload.nbf) {
      return { valid: false, code: 'NOT_YET_VALID', error: 'Token non ancora valido.' };
    }
    if (typeof payload.exp === 'number' && nowSec >= payload.exp) {
      return { valid: false, code: 'EXPIRED', error: 'Token scaduto.' };
    }

    return { valid: true, payload, header };
  },

  // Extract the token from Authorization header with Bearer scheme
  extractFromAuthHeader(authHeader: string | undefined | null): string | null {
    if (!authHeader) return null;
    const match = authHeader.match(/^\s*Bearer\s+([^\s]+)\s*$/i);
    return match ? match[1] : null;
  },
});

export type JWTServiceType = typeof JWTService;
