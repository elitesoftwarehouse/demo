import { authService } from '../modules/auth/auth.service';
import { verifyAccessToken, verifyRefreshToken, decodeToken } from '../config/jwt';
import { seedActiveUser, seedDisabledUser } from './test-utils';

describe('AuthService - login', () => {
  beforeAll(async () => {
    await seedActiveUser('u-as-1', 'serviceuser@example.com', 'ServicePwd123');
    await seedDisabledUser('u-as-2', 'disabled-service@example.com', 'ServicePwd123');
  });

  it('logs in with correct credentials and returns valid JWTs', async () => {
    const result = await authService.login(
      { email: 'serviceuser@example.com', password: 'ServicePwd123' },
      'jest-test'
    );

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.expiresIn).toBeGreaterThan(0);
    expect(result.user.id).toBe('u-as-1');

    const accessPayload = verifyAccessToken(result.accessToken) as any;
    expect(accessPayload.sub).toBe('u-as-1');
    const decoded = decodeToken(result.accessToken) as any;
    expect(decoded).toHaveProperty('exp');

    const refreshPayload = verifyRefreshToken(result.refreshToken!) as any;
    expect(refreshPayload.sub).toBe('u-as-1');
  });

  it('fails with invalid password', async () => {
    await expect(
      authService.login({ email: 'serviceuser@example.com', password: 'WrongPwd' }, 'jest-test')
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('fails with user not found', async () => {
    await expect(
      authService.login({ email: 'noone@example.com', password: 'Anything123' }, 'jest-test')
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('fails when user is disabled', async () => {
    await expect(
      authService.login({ email: 'disabled-service@example.com', password: 'ServicePwd123' }, 'jest-test')
    ).rejects.toMatchObject({ code: 'USER_FORBIDDEN' });
  });
});
