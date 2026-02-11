/**
 * JWT authentication middleware/guard (framework-agnostic).
 *
 * Responsibilities
 * - Extract Bearer token from Authorization header
 * - Verify token signature, integrity and expiration via jwt.service
 * - Attach auth context to request (req.user, req.auth)
 * - Optional role-based authorization and token revocation checks
 * - Standardized 401/403 errors for common failure scenarios
 *
 * This middleware follows the RequestLike/ResponseLike pattern used in controllers,
 * and can be adapted to Express/Fastify by bridging req/res/next.
 */

import { verifyJwt, type JwtPayload } from '../../security/jwt.service';
import type { RequestLike, ResponseLike } from './auth.controller';

export type NextLike = () => void | Promise<void>;

export interface AuthUserContext {
  id: string; // from payload.sub
  email: string;
  roles: string[];
}

export interface AuthContext {
  token: string;
  payload: JwtPayload;
}

export interface AuthenticatedRequestLike extends RequestLike {
  headers?: Record<string, any>;
  user?: AuthUserContext;
  auth?: AuthContext;
}

export interface AuthGuardOptions {
  // If true, a missing/invalid token triggers 401 (default: true). If false, passes through.
  required?: boolean;
  // Required roles for authorization (any-match). If provided, missing roles -> 403.
  roles?: string[];
  // Optional custom revocation checker; return true if token is revoked -> 401.
  isRevoked?: (payload: JwtPayload, token: string) => boolean | Promise<boolean>;
  // If true, attach full payload to req.auth (default: true)
  attachPayload?: boolean;
  // Allow refresh tokens for this guard (default: false). Typically only access tokens are accepted.
  allowRefresh?: boolean;
}

function getAuthorizationHeader(req: any): string | undefined {
  if (!req) return undefined;
  const headers = (req as any).headers || {};
  // Common casings
  return (
    headers['authorization'] ||
    headers['Authorization'] ||
    (typeof req.get === 'function' ? req.get('authorization') : undefined)
  );
}

export function extractBearerToken(req: any): string | null {
  const authz = getAuthorizationHeader(req);
  if (!authz || typeof authz !== 'string') return null;
  const parts = authz.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const [scheme, credentials] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return credentials || null;
}

function respond(res: ResponseLike, code: number, error: string, message?: string): void {
  res.status(code).json({ error, message });
}

function mapVerifyErrorToResponse(err?: string): { code: number; error: string; message: string } {
  switch (err) {
    case 'format':
    case 'invalid':
      return { code: 401, error: 'unauthorized', message: 'invalid_token' };
    case 'signature':
      return { code: 401, error: 'unauthorized', message: 'invalid_signature' };
    case 'expired':
      return { code: 401, error: 'unauthorized', message: 'token_expired' };
    case 'nbf':
      return { code: 401, error: 'unauthorized', message: 'token_not_active' };
    case 'issuer':
    case 'audience':
      return { code: 401, error: 'unauthorized', message: 'invalid_claim' };
    default:
      return { code: 401, error: 'unauthorized', message: 'invalid_token' };
  }
}

export function authGuard(options?: AuthGuardOptions) {
  const opts: Required<Pick<AuthGuardOptions, 'required' | 'attachPayload' | 'allowRefresh'>> &
    AuthGuardOptions = {
      required: options?.required ?? true,
      attachPayload: options?.attachPayload ?? true,
      allowRefresh: options?.allowRefresh ?? false,
      ...options,
    };

  return async function middleware(req: AuthenticatedRequestLike, res: ResponseLike, next: NextLike) {
    const token = extractBearerToken(req);

    if (!token) {
      if (opts.required) {
        return respond(res, 401, 'unauthorized', 'missing_token');
      }
      return next();
    }

    const ver = verifyJwt(token);
    if (!ver.valid || !ver.payload) {
      const mapped = mapVerifyErrorToResponse(ver.error);
      return respond(res, mapped.code, mapped.error, mapped.message);
    }

    // Reject refresh tokens by default unless explicitly allowed
    const typ = (ver.payload as any).typ;
    if (!opts.allowRefresh && typ === 'refresh') {
      return respond(res, 401, 'unauthorized', 'invalid_token_type');
    }

    // Additional iat check: reject tokens issued in the future
    if (typeof ver.payload.iat === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (ver.payload.iat > now) {
        return respond(res, 401, 'unauthorized', 'invalid_iat');
      }
    }

    // Optional revocation check
    if (typeof opts.isRevoked === 'function') {
      try {
        const revoked = await opts.isRevoked(ver.payload, token);
        if (revoked) {
          return respond(res, 401, 'unauthorized', 'token_revoked');
        }
      } catch (_) {
        // On error in revocation check, fail closed
        return respond(res, 401, 'unauthorized', 'token_revocation_check_failed');
      }
    }

    // Build user context from payload
    const roles = Array.isArray(ver.payload.roles) ? ver.payload.roles : [];
    req.user = { id: String(ver.payload.sub), email: String(ver.payload.email || ''), roles };
    if (opts.attachPayload) {
      req.auth = { token, payload: ver.payload };
    }

    // Role enforcement (any-match)
    if (opts.roles && opts.roles.length > 0) {
      const hasRole = roles.some((r) => opts.roles!.includes(r));
      if (!hasRole) {
        return respond(res, 403, 'forbidden', 'insufficient_role');
      }
    }

    return next();
  };
}

// Convenience helper to require roles after authGuard has populated req.user
export function requireRoles(roles: string[]) {
  return function (req: AuthenticatedRequestLike, res: ResponseLike, next: NextLike) {
    if (!req || !req.user) {
      return respond(res, 401, 'unauthorized', 'missing_auth_context');
    }
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];
    const ok = roles.length === 0 || userRoles.some((r) => roles.includes(r));
    if (!ok) {
      return respond(res, 403, 'forbidden', 'insufficient_role');
    }
    return next();
  };
}

/**
 * Usage (Express-like pseudocode):
 *
 * import { authGuard, requireRoles } from './api/auth/jwt.middleware';
 *
 * app.get('/private', authGuard(), (req, res) => res.json({ ok: true }));
 * app.get('/admin', authGuard({ roles: ['admin'] }), (req, res) => res.json({ ok: true }));
 * app.get('/admin-2', authGuard(), requireRoles(['admin']), (req, res) => res.json({ ok: true }));
 *
 * // With custom revocation check (e.g., check a denylist or DB):
 * const isRevoked = async (payload, token) => {
 *   // return true if revoked
 *   return false;
 * };
 * app.get('/secure', authGuard({ isRevoked }), handler);
 */
