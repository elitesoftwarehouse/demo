// AuthService - handles login, credential verification, and token issuance
// IMPORTANT: Never log sensitive info

import { InputValidator } from '../../../core/validation';
import { JwtService, PasswordService } from '../../../core/security';
import type { LoginRequestDTO, TokenResponseDTO, RefreshRequestDTO } from '../domain/dto/JwtDTO';
import type { IUserRepository } from '../../user/repository/UserRepository';

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly passwordSvc: PasswordService = new PasswordService(),
    private readonly jwt: JwtService = new JwtService()
  ) {}

  async login(payload: LoginRequestDTO, ctx?: { userAgent?: string; ip?: string }): Promise<TokenResponseDTO & { user: { id: string; email: string; status: string } }> {
    const email = InputValidator.normalizeEmail(payload?.email || '');
    const password = payload?.password ?? '';

    const errors: string[] = [];
    if (!email) errors.push('email is required');
    if (!password) errors.push('password is required');
    if (email && !InputValidator.isValidEmail(email)) errors.push('invalid email format');

    if (errors.length > 0) {
      const err: any = new Error('Validation error');
      err.code = 'BAD_REQUEST';
      err.details = errors;
      throw err;
    }

    // Retrieve user (avoid leaking existence)
    let user = null;
    try {
      user = await this.users.findByEmail(email);
    } catch (e) {
      // treat as not found to avoid enumeration
      user = null;
    }

    // Always perform a verification to equalize timing
    const fakeHash = '$sc$N=16384,r=8,p=1$w7r1Z5r0cQ9d0bE7TgW0Nw==$q2mYJvS+oZ1m6p1o9Uq1jKpO4x5fS0qv8HqH0k2V1rY='; // random-looking placeholder
    const storedHash = user?.password_hash || fakeHash;
    const passwordOk = await this.passwordSvc.verifyPassword(password, storedHash);

    if (!user || !passwordOk) {
      const err: any = new Error('Invalid credentials');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      const err: any = new Error('Account not active');
      err.code = user.status === 'SUSPENDED' ? 'FORBIDDEN' : 'LOCKED';
      err.status = user.status;
      throw err;
    }

    // Issue tokens
    const access = this.jwt.signAccessToken(user.id, user.email, []);
    const refresh = this.jwt.generateRefreshToken();

    // Persist refresh token (best-effort if repo supports it). We add a simple optional hook method pattern.
    await this.persistRefreshIfSupported({
      userId: user.id,
      tokenHash: refresh.hash,
      issuedAt: refresh.issuedAt,
      expiresAt: refresh.expiresAt,
      userAgent: ctx?.userAgent,
      ipAddress: ctx?.ip,
      familyId: refresh.familyId,
    });

    return {
      accessToken: access.token,
      tokenType: 'Bearer',
      expiresIn: access.expiresIn,
      refreshToken: refresh.token,
      user: { id: user.id, email: user.email, status: user.status },
    };
  }

  // Refresh flow: validate refresh token, rotate if supported, return new access (and refresh)
  async refresh(payload: RefreshRequestDTO, ctx?: { userAgent?: string; ip?: string }): Promise<TokenResponseDTO & { rotated: boolean }> {
    const token = payload?.refreshToken || '';
    if (!token || typeof token !== 'string') {
      const err: any = new Error('Invalid input');
      err.code = 'BAD_REQUEST';
      err.details = ['refreshToken is required'];
      throw err;
    }

    const repoAny = this.users as any;
    if (typeof repoAny.findRefreshTokenByHash !== 'function') {
      const err: any = new Error('Refresh flow not supported');
      err.code = 'NOT_IMPLEMENTED';
      throw err;
    }

    const hash = this.jwt.hashRefreshToken(token);

    // Lookup token record
    let rec: any = null;
    try {
      rec = await repoAny.findRefreshTokenByHash(hash);
    } catch (e) {
      rec = null;
    }

    // Validate existence and status without leaking reasons
    const now = Date.now();
    if (!rec || (rec.revokedAt && new Date(rec.revokedAt).getTime() <= now) || new Date(rec.expiresAt).getTime() <= now) {
      const err: any = new Error('Invalid refresh token');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // Retrieve user info to issue access token
    const userId: string = rec.userId;
    const user = await this.findUserByIdBestEffort(userId);
    if (!user) {
      // If user cannot be loaded, treat as unauthorized to avoid leaking
      const err: any = new Error('Invalid refresh token');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const access = this.jwt.signAccessToken(user.id, user.email, []);

    // Attempt rotation: create new refresh token and revoke old
    let rotated = false;
    try {
      if (typeof repoAny.createRefreshToken === 'function' && typeof repoAny.revokeRefreshToken === 'function') {
        const next = this.jwt.generateRefreshToken();
        const created = await repoAny.createRefreshToken({
          userId: user.id,
          tokenHash: next.hash,
          issuedAt: next.issuedAt,
          expiresAt: next.expiresAt,
          userAgent: ctx?.userAgent,
          ipAddress: ctx?.ip,
          familyId: rec.familyId || next.familyId,
        });
        await repoAny.revokeRefreshToken(rec.id, 'rotated', created.id);
        rotated = true;
        return {
          accessToken: access.token,
          tokenType: 'Bearer',
          expiresIn: access.expiresIn,
          refreshToken: next.token,
          rotated,
        };
      }
    } catch {
      // If rotation fails, fall back to returning access only
    }

    return {
      accessToken: access.token,
      tokenType: 'Bearer',
      expiresIn: access.expiresIn,
      rotated,
    };
  }

  // Logout/revoke: revoke a specific refresh token by value, or all sessions for a user if possible
  async logout(options: { refreshToken?: string; userId?: string }): Promise<{ success: boolean }> {
    const repoAny = this.users as any;
    if (!options?.refreshToken && !options?.userId) {
      const err: any = new Error('Invalid input');
      err.code = 'BAD_REQUEST';
      err.details = ['refreshToken or userId is required'];
      throw err;
    }

    if (typeof repoAny.revokeRefreshToken !== 'function' && typeof repoAny.revokeAllUserTokens !== 'function' && typeof repoAny.findRefreshTokenByHash !== 'function') {
      const err: any = new Error('Logout flow not supported');
      err.code = 'NOT_IMPLEMENTED';
      throw err;
    }

    if (options.refreshToken && typeof repoAny.findRefreshTokenByHash === 'function') {
      const hash = this.jwt.hashRefreshToken(options.refreshToken);
      const rec = await repoAny.findRefreshTokenByHash(hash);
      if (rec && typeof repoAny.revokeRefreshToken === 'function') {
        await repoAny.revokeRefreshToken(rec.id, 'logout', null);
      }
      // Always respond success without revealing whether it existed
      return { success: true };
    }

    if (options.userId && typeof repoAny.revokeAllUserTokens === 'function') {
      await repoAny.revokeAllUserTokens(options.userId, 'logout-all');
      return { success: true };
    }

    // If we reach here, operation type not supported by repo
    const err: any = new Error('Logout flow not supported');
    err.code = 'NOT_IMPLEMENTED';
    throw err;
  }

  private async persistRefreshIfSupported(rec: {
    userId: string;
    tokenHash: string;
    issuedAt: Date;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
    familyId: string;
  }): Promise<void> {
    // Look for an optional repository with createRefreshToken method
    const repoAny = this.users as any;
    if (typeof repoAny.createRefreshToken === 'function') {
      try {
        await repoAny.createRefreshToken(rec);
      } catch {
        // swallow to avoid login failure on persistence hiccup
      }
    }
  }

  private async findUserByIdBestEffort(userId: string): Promise<{ id: string; email: string } | null> {
    const repoAny = this.users as any;
    // Try common method names
    const methods = ['findById', 'findUserById', 'getById'];
    for (const m of methods) {
      if (typeof repoAny[m] === 'function') {
        try {
          const u = await repoAny[m](userId);
          if (u && u.id && u.email) return u;
        } catch {}
      }
    }
    // As a fallback, if repo exposes a list or can search by email via another mapping, not available here
    return null;
  }
}
