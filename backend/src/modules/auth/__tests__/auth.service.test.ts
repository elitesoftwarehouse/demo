import jwt from 'jsonwebtoken';
import bcrypt from '../../../vendor/bcrypt';
import { authService } from '../auth.service';
import { userRepository } from '../../user/user.repository';
import { getJwtVerifyKey, getJwtAlgorithm } from '../../../config/security';

describe('AuthService - login and JWT generation', () => {
  const password = 'Password123!';
  const otherPassword = 'AnotherPass!1';
  const userActive = {
    id: 'svc-u-1',
    email: 'svc.user1@example.com',
    name: 'Service User 1',
    role: 'USER' as const,
    status: 'ACTIVE' as const,
    passwordHash: '',
  };
  const userDisabled = {
    id: 'svc-u-2',
    email: 'svc.user2@example.com',
    name: 'Service User 2',
    role: 'USER' as const,
    status: 'DISABLED' as const,
    passwordHash: '',
  };

  beforeAll(async () => {
    userActive.passwordHash = await bcrypt.hash(password, 10);
    userDisabled.passwordHash = await bcrypt.hash(otherPassword, 10);
    await userRepository.upsert(userActive);
    await userRepository.upsert(userDisabled);
  });

  it('should fail when user is not found', async () => {
    await expect(
      authService.login({ email: 'missing@example.com', password: 'whatever' })
    ).rejects.toHaveProperty('statusCode', 401);
  });

  it('should fail when password is wrong', async () => {
    await expect(
      authService.login({ email: userActive.email, password: 'WrongPassword!' })
    ).rejects.toHaveProperty('statusCode', 401);
  });

  it('should fail when user is disabled', async () => {
    await expect(
      authService.login({ email: userDisabled.email, password: otherPassword })
    ).rejects.toHaveProperty('statusCode', 403);
  });

  it('should login and return valid JWT tokens with required claims', async () => {
    const res = await authService.login({ email: userActive.email, password });

    expect(res.accessToken).toBeDefined();
    expect(typeof res.accessToken).toBe('string');
    expect(res.refreshToken).toBeDefined();
    expect(res.tokenType).toBe('Bearer');
    expect(res.expiresIn).toBeGreaterThan(0);
    expect(res.user).toEqual({ id: userActive.id, email: userActive.email, name: userActive.name, role: 'USER' });

    const payload = jwt.verify(res.accessToken, getJwtVerifyKey(), {
      algorithms: [getJwtAlgorithm()],
    }) as any;

    expect(payload.sub).toBe(userActive.id);
    expect(payload.role).toBe('USER');
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(payload.iat).toBeLessThanOrEqual(payload.exp);
  });
});
