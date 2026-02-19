import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository } from '../modules/users/user.repository';

export async function seedActiveUser(id = 'u-1', email = 'user@example.com', password = 'SecretPwd123') {
  const passwordHash = await bcrypt.hash(password, 10);
  await userRepository.upsert({
    id,
    email,
    passwordHash,
    name: 'Test User',
    role: 'USER',
    status: 'ACTIVE',
  });
  return { id, email, password };
}

export async function seedDisabledUser(
  id = 'u-2',
  email = 'disabled@example.com',
  password = 'SecretPwd123'
) {
  const passwordHash = await bcrypt.hash(password, 10);
  await userRepository.upsert({
    id,
    email,
    passwordHash,
    name: 'Disabled User',
    role: 'USER',
    status: 'DISABLED',
  });
  return { id, email, password };
}

export function signExpiredAccessToken(userId: string) {
  const secret = process.env.JWT_SECRET || 'test-secret-access';
  const exp = Math.floor(Date.now() / 1000) - 60; // already expired
  return jwt.sign({ sub: userId, exp }, secret, { algorithm: 'HS256' as any });
}

export function signExpiredRefreshToken(userId: string) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'test-secret-refresh';
  const exp = Math.floor(Date.now() / 1000) - 60; // already expired
  return jwt.sign({ sub: userId, exp }, secret, { algorithm: 'HS256' as any });
}

export function signInvalidAccessToken(userId: string) {
  // Signed with wrong secret
  return jwt.sign({ sub: userId }, 'wrong-secret', { algorithm: 'HS256' as any, expiresIn: '5m' });
}
