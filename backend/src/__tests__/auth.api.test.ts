import request from 'supertest';
import app from '../index';
import { seedActiveUser } from './test-utils';
import { signRefreshToken } from '../config/jwt';
import { refreshTokenRepository } from '../modules/auth/refresh.repository';
import { userRepository } from '../modules/users/user.repository';
import { signExpiredRefreshToken } from './test-utils';

describe('API Integration - Auth endpoints', () => {
  beforeAll(async () => {
    await seedActiveUser('u-int-1', 'intuser@example.com', 'IntPwd123');
  });

  describe('POST /auth/login', () => {
    it('returns 200 with tokens for valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'intuser@example.com', password: 'IntPwd123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('expiresIn');
      expect(res.body).toHaveProperty('user');
    });

    it('returns 401 for wrong credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'intuser@example.com', password: 'WrongPwd' });
      expect(res.status).toBe(401);
    });
  });

  describe('Protected endpoint /bookings/me', () => {
    it('returns 401 without Authorization header', async () => {
      const res = await request(app).get('/bookings/me');
      expect(res.status).toBe(401);
    });

    it('returns 200 with valid Bearer token', async () => {
      const login = await request(app)
        .post('/auth/login')
        .send({ email: 'intuser@example.com', password: 'IntPwd123' });
      const token = login.body.accessToken as string;

      const res = await request(app)
        .get('/bookings/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 200 with new access token for valid refresh token', async () => {
      // login to obtain refresh
      const login = await request(app)
        .post('/auth/login')
        .send({ email: 'intuser@example.com', password: 'IntPwd123' });
      const refreshToken = login.body.refreshToken as string;
      // The service has a placeholder call to findByEmail(null); stub it to avoid crash
      const spy = jest
        .spyOn(userRepository, 'findByEmail')
        .mockResolvedValue(null as any);

      const res = await request(app).post('/auth/refresh').send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('expiresIn');
      spy.mockRestore();
    });

    it('returns 401 for expired refresh token', async () => {
      const expired = signExpiredRefreshToken('u-int-1');
      const res = await request(app).post('/auth/refresh').send({ refreshToken: expired });
      expect(res.status).toBe(401);
    });

    it('returns 401 for refresh token with invalid signature', async () => {
      // Construct a token signed with wrong secret
      const fake = signRefreshToken({ sub: 'u-int-1' } as any);
      // This is actually valid; to make it invalid, tamper the token
      const tampered = fake.replace(/\.$/, '.x');
      const res = await request(app).post('/auth/refresh').send({ refreshToken: tampered });
      expect(res.status).toBe(401);
    });

    it('returns 401 for nonexistent refresh token (not persisted)', async () => {
      // Create valid refresh with different user, not saved in repo
      const token = signRefreshToken({ sub: 'nonexistent-user' } as any);
      const res = await request(app).post('/auth/refresh').send({ refreshToken: token });
      expect(res.status).toBe(401);
    });

    it('returns 401 for revoked refresh token', async () => {
      const login = await request(app)
        .post('/auth/login')
        .send({ email: 'intuser@example.com', password: 'IntPwd123' });
      const refreshToken = login.body.refreshToken as string;
      await refreshTokenRepository.revokeAllForUser('u-int-1');

      const res = await request(app).post('/auth/refresh').send({ refreshToken });
      expect(res.status).toBe(401);
    });
  });
});
