import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository } from '../users/user.repository';

export interface LoginDto {
  email: string;
  password: string;
}

interface JwtPayload {
  sub: string; // userId
  role?: string;
  tenantId?: string;
}

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '30m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function signAccessToken(payload: JwtPayload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET');
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function signRefreshToken(payload: JwtPayload) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_REFRESH_SECRET');
  return jwt.sign({ sub: payload.sub }, secret, {
    algorithm: 'HS256',
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

class AuthService {
  async login(data: LoginDto) {
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

    // In a real app we would persist refresh token hash with device/UA info and expiry
    // For MVP we skip persistence

    const decoded = jwt.decode(accessToken) as any;
    const exp = typeof decoded === 'object' ? decoded?.exp : undefined;
    const expiresIn = exp ? Math.max(0, exp * 1000 - Date.now()) : undefined;

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
}

export const authService = new AuthService();
