import bcrypt from 'bcrypt';
import { userRepository } from '../users/user.repository';
import { decodeToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../config/jwt';
import { refreshTokenRepository } from './refresh.repository';

export interface LoginDto {
  email: string;
  password: string;
}

interface JwtPayload {
  sub: string; // userId
  role?: string;
  tenantId?: string;
}

class AuthService {
  async login(data: LoginDto, userAgent?: string) {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      const error: any = new Error('Invalid credentials');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (user.status && user.status !== 'ACTIVE') {
      const error: any = new Error('User forbidden');
      error.code = 'USER_FORBIDDEN';
      throw error;
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      const error: any = new Error('Invalid credentials');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role || 'USER',
      tenantId: user.tenantId,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Persist refresh token hash with expiry
    const rtd = decodeToken(refreshToken) as any;
    const rExpSec = typeof rtd === 'object' ? rtd?.exp : undefined; // seconds
    const rExpiresAt = rExpSec ? rExpSec * 1000 : Date.now() + 7 * 24 * 3600 * 1000;
    await refreshTokenRepository.save(refreshToken, user.id, rExpiresAt, userAgent);

    // Compute expiresIn in SECONDS from access token 'exp'
    const decoded = decodeToken(accessToken) as any;
    const exp = typeof decoded === 'object' ? decoded?.exp : undefined; // seconds epoch
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresIn = exp ? Math.max(0, exp - nowSec) : 0;

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'USER',
      },
    };
  }

  async refresh(refreshToken: string) {
    // Verify refresh token signature and expiration
    let payload: any;
    try {
      payload = verifyRefreshToken(refreshToken) as any;
    } catch {
      const e: any = new Error('Invalid refresh');
      e.code = 'INVALID_REFRESH';
      throw e;
    }

    const userId = payload?.sub as string | undefined;
    if (!userId) {
      const e: any = new Error('Invalid refresh');
      e.code = 'INVALID_REFRESH';
      throw e;
    }

    // Check against repository (revocation and expiry enforced)
    const rec = await refreshTokenRepository.findValidForUser(userId, refreshToken);
    if (!rec) {
      const e: any = new Error('Invalid refresh');
      e.code = 'INVALID_REFRESH';
      throw e;
    }

    // Issue new access token (do not rotate refresh in MVP)
    const user = await userRepository.findByEmail((null as any)); // placeholder
    // We do not have findById; create minimal payload for access token
    const accessToken = signAccessToken({ sub: userId });

    const ad = decodeToken(accessToken) as any;
    const exp = typeof ad === 'object' ? ad?.exp : undefined;
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresIn = exp ? Math.max(0, exp - nowSec) : 0;

    return {
      accessToken,
      refreshToken, // same token (no rotation in MVP)
      expiresIn,
      tokenType: 'Bearer',
    };
  }
}

export const authService = new AuthService();
