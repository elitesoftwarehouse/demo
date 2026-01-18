// JwtAuthMiddleware - Express-style middleware to protect routes using JWT Bearer tokens
// Responsibilities:
// - Extract Bearer token from Authorization header
// - Validate signature, integrity, and expiry via JwtService
// - Optionally check token against a revocation predicate
// - Attach user info (id/email/roles) to request as req.user
// - Handle errors with standardized 401/403 responses without leaking sensitive details

import type { Request, Response, NextFunction } from 'express';
import { JwtService } from '../../../core/security';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles?: string[];
  raw?: any; // full payload if needed by downstream handlers
}

// Predicate interface to optionally validate if a given token (jti or signature hash) is revoked
export type TokenRevocationChecker = (payload: any) => Promise<boolean> | boolean;

export interface JwtAuthOptions {
  jwt?: JwtService;
  // If provided, invoked with decoded payload; if returns true => token is revoked (reject)
  isRevoked?: TokenRevocationChecker;
  requireRoles?: string[]; // if set, ensure payload.roles contains these
}

export function jwtAuthGuard(opts?: JwtAuthOptions) {
  const jwt = opts?.jwt ?? new JwtService();
  const isRevoked = opts?.isRevoked;
  const requiredRoles = opts?.requireRoles ?? [];

  return async function (req: Request & { user?: AuthenticatedUser }, res: Response, next: NextFunction) {
    try {
      const auth = String(req.headers['authorization'] || '');
      if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
        return res.status(401).json({ success: false, error: { message: 'Unauthorized: missing bearer token' } });
      }
      const token = auth.slice(7).trim();
      if (!token) {
        return res.status(401).json({ success: false, error: { message: 'Unauthorized: missing bearer token' } });
      }

      let payload: any;
      try {
        payload = jwt.verifyAccessToken(token);
      } catch (e: any) {
        const code = e?.code || 'TOKEN_INVALID';
        const status = code === 'TOKEN_EXPIRED' ? 401 : 401;
        const message = code === 'TOKEN_EXPIRED' ? 'Unauthorized: token expired' : 'Unauthorized: invalid token';
        return res.status(status).json({ success: false, error: { message, code } });
      }

      if (isRevoked) {
        try {
          const revoked = await isRevoked(payload);
          if (revoked) {
            return res.status(401).json({ success: false, error: { message: 'Unauthorized: token revoked' } });
          }
        } catch {
          // if revocation check fails, be conservative
          return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        }
      }

      // Roles check if configured
      if (requiredRoles.length > 0) {
        const roles: string[] = Array.isArray(payload?.roles) ? payload.roles : [];
        const missing = requiredRoles.filter((r) => !roles.includes(r));
        if (missing.length > 0) {
          return res.status(403).json({ success: false, error: { message: 'Forbidden: insufficient role' } });
        }
      }

      // Attach user to request for downstream usage
      req.user = {
        id: String(payload?.sub || ''),
        email: String(payload?.email || ''),
        roles: Array.isArray(payload?.roles) ? payload.roles : undefined,
        raw: payload,
      };

      return next();
    } catch {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
  };
}

// Helper to build role-based guard easily
export function requireRoles(...roles: string[]) {
  return jwtAuthGuard({ requireRoles: roles });
}
