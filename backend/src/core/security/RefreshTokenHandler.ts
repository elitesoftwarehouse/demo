// RefreshTokenHandler: Express-like handler to issue new access tokens using a refresh token
// Accepts HttpOnly cookie (preferred) or request body { refreshToken }
// Validates signature/exp, optional revocation, and supports rotation strategy

import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { JWTService, type JWTPayload } from './JWTService';

export type RequestLike = IncomingMessage & {
  body?: any;
};

export type ResponseLike = ServerResponse & {
  json?: (body: any) => void;
  status?: (code: number) => ResponseLike;
};

export type NextFunction = (err?: any) => void;

export type TokenRevocationChecker = (jti: string | undefined, rawToken: string, payload?: JWTPayload) => Promise<boolean> | boolean;

export type RefreshHandlerOptions = {
  // Optional: check if a refresh token has been revoked/invalidated
  isRevoked?: TokenRevocationChecker;
  // Short TTL (seconds) for access token
  accessTtlSec?: number; // default: env AUTH_ACCESS_TTL_SEC or 900
  // Long TTL (seconds) for refresh token
  refreshTtlSec?: number; // default: env AUTH_REFRESH_TTL_SEC or 2592000 (30d)
  // Enable refresh token rotation: issue a new refresh token on each use
  rotateRefreshToken?: boolean; // default true
  // Cookie name to read/write refresh token
  cookieName?: string; // default 'refresh_token'
  // Path to set for refresh cookie
  cookiePath?: string; // default '/'
  // Audience to set in new tokens (optional)
  audience?: string | string[];
  // Optional additional claims to include in access tokens
  buildAccessClaims?: (payload: JWTPayload) => Record<string, any>;
  // Optional additional claims to include in rotated refresh tokens
  buildRefreshClaims?: (payload: JWTPayload) => Record<string, any>;
};

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx > -1) {
      const k = p.slice(0, idx).trim();
      const v = p.slice(idx + 1).trim();
      if (k) out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

function sendUnauthorized(res: ResponseLike, message: string) {
  const code = 401;
  if (typeof res.status === 'function') res.status(code);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const body = { statusCode: code, error: 'Unauthorized', message };
  if (typeof res.json === 'function') return res.json(body);
  res.end(JSON.stringify(body));
}

function setRefreshCookie(res: ResponseLike, name: string, token: string, ttlSec: number, path: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${name}=${encodeURIComponent(token)}`,
    `Path=${path || '/'}`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${Math.max(0, Math.floor(ttlSec))}`,
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function generateJti(): string {
  return randomBytes(16).toString('hex');
}

function isRefreshTokenPayload(payload: JWTPayload | undefined): boolean {
  if (!payload) return false;
  const t = (payload as any).typ || (payload as any).type || (payload as any).token_use;
  return String(t || '').toLowerCase() === 'refresh';
}

export function createRefreshTokenHandler(opts: RefreshHandlerOptions = {}) {
  const accessTtl = Number.parseInt(process.env.AUTH_ACCESS_TTL_SEC || process.env.JWT_ACCESS_TTL_SEC || '900', 10);
  const refreshTtl = Number.parseInt(process.env.AUTH_REFRESH_TTL_SEC || process.env.JWT_REFRESH_TTL_SEC || `${30 * 24 * 60 * 60}`, 10);

  const options: Required<Pick<RefreshHandlerOptions, 'accessTtlSec' | 'refreshTtlSec' | 'rotateRefreshToken' | 'cookieName' | 'cookiePath'>> & RefreshHandlerOptions = {
    accessTtlSec: opts.accessTtlSec ?? accessTtl,
    refreshTtlSec: opts.refreshTtlSec ?? refreshTtl,
    rotateRefreshToken: opts.rotateRefreshToken ?? true,
    cookieName: opts.cookieName ?? 'refresh_token',
    cookiePath: opts.cookiePath ?? '/',
    ...opts,
  };

  return async function refreshHandler(req: RequestLike, res: ResponseLike, _next?: NextFunction) {
    try {
      const cookies = parseCookies(req.headers?.cookie as string | undefined);
      const bodyToken = (req as any).body?.refreshToken || (req as any).body?.token;
      const refreshToken = cookies[options.cookieName!] || bodyToken;
      if (!refreshToken || typeof refreshToken !== 'string') {
        return sendUnauthorized(res, 'Refresh token mancante.');
      }

      const verification = JWTService.verify(refreshToken);
      if (!verification.valid || !verification.payload) {
        const msg = verification.error || 'Refresh token non valido.';
        return sendUnauthorized(res, msg);
      }

      if (!isRefreshTokenPayload(verification.payload)) {
        return sendUnauthorized(res, 'Il token fornito non è un refresh token.');
      }

      if (typeof options.isRevoked === 'function') {
        const revoked = await options.isRevoked(verification.payload.jti, refreshToken, verification.payload);
        if (revoked) return sendUnauthorized(res, 'Refresh token revocato.');
      }

      const userId = verification.payload.sub;
      if (!userId) return sendUnauthorized(res, 'Refresh token non associato a un utente.');

      // Build access token claims
      const roles = Array.isArray(verification.payload.roles) ? verification.payload.roles : [];
      const extraAccessClaims = typeof options.buildAccessClaims === 'function' ? options.buildAccessClaims(verification.payload) : {};
      const accessPayload: JWTPayload = {
        sub: userId,
        roles,
        ...extraAccessClaims,
      };

      const accessToken = JWTService.sign(accessPayload, {
        expiresInSec: options.accessTtlSec,
        audience: options.audience,
        subject: userId,
      });

      let newRefreshToken: string | undefined;
      if (options.rotateRefreshToken) {
        const extraRefreshClaims = typeof options.buildRefreshClaims === 'function' ? options.buildRefreshClaims(verification.payload) : {};
        const refreshPayload: JWTPayload = {
          sub: userId,
          roles,
          typ: 'refresh',
          jti: generateJti(),
          ...extraRefreshClaims,
        };
        newRefreshToken = JWTService.sign(refreshPayload, {
          expiresInSec: options.refreshTtlSec,
          audience: options.audience,
          subject: userId,
        });
        // Set new cookie with rotated refresh token
        setRefreshCookie(res, options.cookieName!, newRefreshToken, options.refreshTtlSec!, options.cookiePath!);
      }

      // Response payload standard
      const payload = {
        tokenType: 'Bearer',
        accessToken,
        expiresIn: options.accessTtlSec,
        refreshToken: newRefreshToken, // only provided when rotating
      };

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (typeof res.json === 'function') return res.json(payload);
      res.end(JSON.stringify(payload));
    } catch (err) {
      return sendUnauthorized(res as ResponseLike, 'Errore durante il refresh del token.');
    }
  };
}

export type RefreshTokenHandler = ReturnType<typeof createRefreshTokenHandler>;
