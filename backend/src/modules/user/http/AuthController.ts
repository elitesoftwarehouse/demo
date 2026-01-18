// AuthController - HTTP endpoint for user signup and login
// This file defines Express-like handlers without binding to a specific server framework
// IMPORTANT: Never log sensitive values

import type { Request, Response } from 'express';
import { SignupService } from '../service/SignupService';
import type { IUserRepository } from '../repository/UserRepository';
import { AuthService } from '../../auth/service/AuthService';

export class AuthController {
  constructor(private readonly signupService: SignupService, private readonly authService: AuthService) {}

  static build(usersRepo: IUserRepository): AuthController {
    const service = new SignupService(usersRepo);
    const auth = new AuthService(usersRepo);
    return new AuthController(service, auth);
  }

  // POST /api/auth/signup
  signup = async (req: Request, res: Response) => {
    try {
      const { email, password } = (req.body || {}) as { email?: string; password?: string };
      const result = await this.signupService.signup({ email: email ?? '', password: password ?? '' });
      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (e: any) {
      // Map known errors to HTTP codes with safe messages
      if (e?.code === 'BAD_REQUEST') {
        return res.status(400).json({ success: false, error: { message: 'Invalid input', details: e.details || [] } });
      }
      if (e?.code === 'CONFLICT') {
        return res.status(409).json({ success: false, error: { message: 'Email already registered' } });
      }
      // generic error
      return res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  };

  // POST /api/auth/login
  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = (req.body || {}) as { email?: string; password?: string };
      const result = await this.authService.login({ email: email ?? '', password: password ?? '' }, {
        userAgent: req.headers['user-agent'] as string | undefined,
        ip: (req.headers['x-forwarded-for'] as string) || req.ip,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (e: any) {
      if (e?.code === 'BAD_REQUEST') {
        return res.status(400).json({ success: false, error: { message: 'Invalid input', details: e.details || [] } });
      }
      if (e?.code === 'UNAUTHORIZED') {
        return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
      }
      if (e?.code === 'LOCKED') {
        return res.status(423).json({ success: false, error: { message: 'Account not active' } });
      }
      if (e?.code === 'FORBIDDEN') {
        return res.status(403).json({ success: false, error: { message: 'Access denied' } });
      }
      return res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  };

  // Helper: parse cookie header string into map (avoid dependency on cookie-parser)
  private parseCookieHeader(cookieHeader?: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!cookieHeader) return out;
    const parts = cookieHeader.split(';');
    for (const part of parts) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      const name = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (name) out[name] = decodeURIComponent(val);
    }
    return out;
  }

  // POST /api/auth/refresh
  refresh = async (req: Request, res: Response) => {
    try {
      // Prefer HttpOnly cookie if available; fall back to body
      const cookies = (req as any).cookies || this.parseCookieHeader(req.headers['cookie'] as string | undefined);
      const cookieToken = cookies?.refreshToken || cookies?.rt || cookies?.refresh_token;
      const { refreshToken: bodyToken } = (req.body || {}) as { refreshToken?: string };
      const refreshToken = (cookieToken || bodyToken || '') as string;

      const result = await this.authService.refresh({ refreshToken }, {
        userAgent: req.headers['user-agent'] as string | undefined,
        ip: (req.headers['x-forwarded-for'] as string) || req.ip,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (e: any) {
      if (e?.code === 'BAD_REQUEST') {
        return res.status(400).json({ success: false, error: { message: 'Invalid input', details: e.details || [] } });
      }
      if (e?.code === 'UNAUTHORIZED') {
        return res.status(401).json({ success: false, error: { message: 'Invalid refresh token' } });
      }
      if (e?.code === 'NOT_IMPLEMENTED') {
        return res.status(501).json({ success: false, error: { message: 'Refresh not supported' } });
      }
      return res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  };

  // POST /api/auth/logout
  logout = async (req: Request, res: Response) => {
    try {
      const { refreshToken, all } = (req.body || {}) as { refreshToken?: string; all?: boolean };
      // If 'all' and we have an authenticated user via middleware, revoke all tokens for user
      if (all && (req as any).user?.id) {
        await this.authService.logout({ userId: (req as any).user.id });
        return res.status(200).json({ success: true });
      }
      // Otherwise, try to revoke specific refresh token value; prefer cookie if present
      const cookies = (req as any).cookies || this.parseCookieHeader(req.headers['cookie'] as string | undefined);
      const cookieToken = cookies?.refreshToken || cookies?.rt || cookies?.refresh_token;
      await this.authService.logout({ refreshToken: refreshToken || cookieToken });
      return res.status(200).json({ success: true });
    } catch (e: any) {
      if (e?.code === 'BAD_REQUEST') {
        return res.status(400).json({ success: false, error: { message: 'Invalid input', details: e.details || [] } });
      }
      if (e?.code === 'NOT_IMPLEMENTED') {
        return res.status(501).json({ success: false, error: { message: 'Logout not supported' } });
      }
      return res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  };
}
