import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from '../../../vendor/bcrypt';
import { createApp } from '../../../app';
import { userRepository } from '../../user/user.repository';
import { getJwtSigningKey, getJwtAlgorithm } from '../../../config/security';

const app = createApp();

describe('POST /auth/refresh', () => {
  const email = 'refresh.user@example.com';
  const password = 'Password123!';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(password, 10);
    await userRepository.upsert({
      id: 'refresh-u-1',
      email,
      passwordHash,
      name: 'Refresh User',
      role: 'USER',
      status: 'ACTIVE',
    });
  });

  it('should refresh tokens when refresh token is valid', async () => {
    const login = await request(app).post('/auth/login').send({ email, password });
    expect(login.status).toBe(200);

    const refreshRes = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();
    expect(refreshRes.body.tokenType).toBe('Bearer');
  });

  it('should return 401 for expired refresh token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = jwt.sign(
      { sub: 'some-user', type: 'refresh', iat: now - 120, exp: now - 60 },
      getJwtSigningKey(),
      { algorithm: getJwtAlgorithm() }
    );

    const res = await request(app).post('/auth/refresh').send({ refreshToken: expired });
    expect(res.status).toBe(401);
  });

  it('should return 401 for revoked refresh token (after rotation)', async () => {
    const login = await request(app).post('/auth/login').send({ email, password });
    const firstToken = login.body.refreshToken as string;

    const rotate = await request(app).post('/auth/refresh').send({ refreshToken: firstToken });
    expect(rotate.status).toBe(200);

    const reuse = await request(app).post('/auth/refresh').send({ refreshToken: firstToken });
    expect(reuse.status).toBe(401);
  });

  it('should return 401 for a well-formed but unknown refresh token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const unsigned = jwt.sign(
      { sub: 'unknown-user', type: 'refresh', iat: now, exp: now + 3600 },
      getJwtSigningKey(),
      { algorithm: getJwtAlgorithm() }
    );

    const res = await request(app).post('/auth/refresh').send({ refreshToken: unsigned });
    expect(res.status).toBe(401);
  });
});
