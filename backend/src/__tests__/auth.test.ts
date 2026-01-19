import request from 'supertest';
import app from '../index';
import { userRepository } from '../modules/users/user.repository';
import bcrypt from 'bcrypt';

describe('Auth Login', () => {
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('SecretPwd123', 10);
    await userRepository.upsert({
      id: 'u-1',
      email: 'user@example.com',
      passwordHash,
      name: 'Test User',
      role: 'USER',
      status: 'ACTIVE',
    });
  });

  it('returns 400 for invalid body', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'bad', password: '1' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns tokens for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'SecretPwd123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('expiresIn');
    expect(res.body).toHaveProperty('user');
  });
});
