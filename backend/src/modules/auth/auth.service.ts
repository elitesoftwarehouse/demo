import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from '../../vendor/bcrypt';
import { userRepository } from '../user/user.repository';
import {
  ACCESS_TOKEN_TTL_MIN,
  REFRESH_TOKEN_TTL_DAYS,
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
  getJwtAlgorithm,
  getJwtSigningKey,
  getJwtVerifyKey,
} from '../../config/security';
import { refreshTokenRepository } from './refresh-token.repository';

export interface LoginInput {
  email: string;
  password: string;
  userAgent?: string;
}

class AuthService {
  private signAccessToken(user: { id: string; role?: string; name: string }) {
    const nowSec = Math.floor(Date.now() / 1000);
    const accessExp = nowSec + ACCESS_TOKEN_TTL_SEC;
    const algorithm = getJwtAlgorithm();

    const accessToken = jwt.sign(
      {
        sub: user.id,
        role: user.role || 'USER',
        name: user.name,
        iat: nowSec,
        exp: accessExp,
      },
      getJwtSigningKey(),
      { algorithm }
    );
    return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SEC };
  }

  private async issueAndStoreRefreshToken(userId: string, userAgent?: string) {
    const nowSec = Math.floor(Date.now() / 1000);
    const refreshExp = nowSec + REFRESH_TOKEN_TTL_SEC;
    const algorithm = getJwtAlgorithm();
    const jti = crypto.randomUUID();

    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh', iat: nowSec, exp: refreshExp, ua: userAgent, jti },
      getJwtSigningKey(),
      { algorithm }
    );

    await refreshTokenRepository.create({
      id: jti,
      userId,
      token: refreshToken,
      userAgent,
      createdAt: new Date(nowSec * 1000),
      expiresAt: new Date(refreshExp * 1000),
    });

    return refreshToken;
  }

  async login({ email, password, userAgent }: LoginInput) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error: any = new Error('Credenziali non valide');
      error.statusCode = 401;
      throw error;
    }
    if (user.status && user.status !== 'ACTIVE') {
      const error: any = new Error('Utente non abilitato');
      error.statusCode = 403;
      throw error;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const error: any = new Error('Credenziali non valide');
      error.statusCode = 401;
      throw error;
    }

    const { accessToken, expiresIn } = this.signAccessToken({ id: user.id, role: user.role, name: user.name });
    const refreshToken = await this.issueAndStoreRefreshToken(user.id, userAgent);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer' as const,
      user: { id: user.id, email: user.email, name: user.name, role: user.role || 'USER' },
    };
  }

  async refresh(refreshToken: string, userAgent?: string) {
    try {
      const payload = jwt.verify(refreshToken, getJwtVerifyKey(), {
        algorithms: [getJwtAlgorithm()],
      }) as any;
      if (payload.type !== 'refresh') {
        const error: any = new Error('Token non valido');
        error.statusCode = 400;
        throw error;
      }
      const stored = await refreshTokenRepository.findValidByToken(refreshToken);
      if (!stored) {
        const error: any = new Error('Refresh token non valido o revocato');
        error.statusCode = 401;
        throw error;
      }

      const userId = payload.sub as string;
      const user = await userRepository.findById(userId);
      if (!user) {
        const error: any = new Error('Utente non trovato');
        error.statusCode = 404;
        throw error;
      }

      // Rotate refresh token
      await refreshTokenRepository.revokeByToken(refreshToken);
      const newRefresh = await this.issueAndStoreRefreshToken(userId, userAgent || stored.userAgent);

      const { accessToken, expiresIn } = this.signAccessToken({ id: user.id, role: user.role, name: user.name });

      return {
        accessToken,
        refreshToken: newRefresh,
        expiresIn,
        tokenType: 'Bearer' as const,
        user: { id: user.id, email: user.email, name: user.name, role: user.role || 'USER' },
      };
    } catch (e: any) {
      const err: any = new Error('Refresh token non valido');
      err.statusCode = 401;
      throw err;
    }
  }
}

export const authService = new AuthService();
