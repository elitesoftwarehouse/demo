import jwt from 'jsonwebtoken';
import bcrypt from '../../vendor/bcrypt';
import { userRepository } from '../user/user.repository';

const ACCESS_TOKEN_TTL_MIN = parseInt(process.env.ACCESS_TOKEN_TTL_MIN || '30', 10);
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface LoginInput {
  email: string;
  password: string;
  userAgent?: string;
}

class AuthService {
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

    const nowSec = Math.floor(Date.now() / 1000);
    const accessExp = nowSec + ACCESS_TOKEN_TTL_MIN * 60;

    const accessToken = jwt.sign(
      {
        sub: user.id,
        role: user.role || 'USER',
        name: user.name,
        iat: nowSec,
        exp: accessExp,
      },
      JWT_SECRET,
      { algorithm: 'HS256' }
    );

    // Simple refresh token strategy (stateless for now). In real app, persist hash in DB
    const refreshExp = nowSec + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh', iat: nowSec, exp: refreshExp, ua: userAgent },
      JWT_SECRET,
      { algorithm: 'HS256' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_MIN * 60,
      tokenType: 'Bearer',
      user: { id: user.id, email: user.email, name: user.name, role: user.role || 'USER' },
    };
  }
}

export const authService = new AuthService();
