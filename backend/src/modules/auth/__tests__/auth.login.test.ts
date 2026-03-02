import request from 'supertest';
import bcrypt from '../../../vendor/bcrypt';
import { createApp } from '../../../app';
import { userRepository } from '../../user/user.repository';

const app = createApp();

describe('POST /auth/login', () => {
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await userRepository.upsert({
      id: 'u-1',
      email: 'user@example.com',
      passwordHash,
      name: 'Test User',
      role: 'USER',
      status: 'ACTIVE',
    });
  });

  it('should return 400 on invalid input', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('should return 401 on wrong credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPassword' });
    expect(res.status).toBe(401);
  });

  it('should login and return tokens', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.expiresIn).toBeGreaterThan(0);
  });

  it('should protect routes with JWT', async () => {
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'Password123!' });
    const token = login.body.accessToken;

    const res = await request(app)
      .get('/protected/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.me).toBeDefined();
  });
});
