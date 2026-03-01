// Express-like middleware for JWT auth. If your server uses a different framework,
// adapt the types accordingly. This module focuses on core logic.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { JWTService } from './JWTService';

export type Role = string;

export type RequestWithUser = IncomingMessage & {
  user?: {
    id?: string;
    roles?: Role[];
    token?: string;
    claims?: Record<string, any>;
  };
};

export type ResponseLike = ServerResponse & {
  json?: (body: any) => void;
  status?: (code: number) => ResponseLike;
};

export type NextFunction = (err?: any) => void;

export type TokenRevocationChecker = (jti: string | undefined, rawToken: string) => Promise<boolean> | boolean;

export type AuthOptions = {
  // Optional: function that checks if a token is revoked
  isRevoked?: TokenRevocationChecker;
  // Optional: required roles for route
  roles?: Role[];
  // If true, attach the raw token to request.user.token
  attachToken?: boolean;
};

function sendUnauthorized(res: ResponseLike, message: string) {
  const code = 401;
  if (typeof res.status === 'function') res.status(code);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (typeof res.json === 'function') return res.json({ statusCode: code, error: 'Unauthorized', message });
  res.end(JSON.stringify({ statusCode: code, error: 'Unauthorized', message }));
}

function sendForbidden(res: ResponseLike, message: string) {
  const code = 403;
  if (typeof res.status === 'function') res.status(code);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (typeof res.json === 'function') return res.json({ statusCode: code, error: 'Forbidden', message });
  res.end(JSON.stringify({ statusCode: code, error: 'Forbidden', message }));
}

// Factory: returns a middleware that validates JWT and attaches user info to request
export function jwtAuthGuard(options: AuthOptions = {}) {
  const requiredRoles = options.roles || [];

  return async function middleware(req: RequestWithUser, res: ResponseLike, next: NextFunction) {
    try {
      const rawAuth = req.headers?.authorization as string | undefined;
      const token = JWTService.extractFromAuthHeader(rawAuth || '');
      if (!token) return sendUnauthorized(res, 'Token di autenticazione mancante o malformato.');

      const result = JWTService.verify(token);
      if (!result.valid || !result.payload) {
        const msg = result.error || 'Token non valido.';
        const code = result.code;
        if (code === 'EXPIRED' || code === 'MISSING_TOKEN' || code === 'MALFORMED' || code === 'INVALID_SIGNATURE' || code === 'INVALID') {
          return sendUnauthorized(res, msg);
        }
        return sendForbidden(res, msg);
      }

      // Optional revocation check
      if (typeof options.isRevoked === 'function') {
        const revoked = await options.isRevoked(result.payload.jti, token);
        if (revoked) {
          return sendUnauthorized(res, 'Token revocato.');
        }
      }

      // Attach user info
      const userId = result.payload.sub;
      const roles = Array.isArray(result.payload.roles) ? result.payload.roles : [];
      req.user = {
        id: userId,
        roles,
        token: options.attachToken ? token : undefined,
        claims: result.payload,
      };

      // Roles check
      if (requiredRoles.length > 0) {
        const hasRole = roles.some((r) => requiredRoles.includes(r));
        if (!hasRole) return sendForbidden(res, 'Permessi insufficienti.');
      }

      return next();
    } catch (err) {
      return sendUnauthorized(res, 'Errore di autenticazione.');
    }
  };
}

// Helper to require specific roles on routes
export function requireRoles(...roles: Role[]) {
  return jwtAuthGuard({ roles });
}
