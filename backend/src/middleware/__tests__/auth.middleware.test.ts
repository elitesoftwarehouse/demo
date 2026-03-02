import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app';
import { getJwtSigningKey, getJwtAlgorithm } from '../../config/security';

const app = createApp();

describe('Auth middleware - requireAuth', () => {
  function signTestToken(payload: Record<string, any>) {
    return jwt.sign(payload, getJwtSigningKey(), { algorithm: getJwtAlgorithm() });
  }

  it('should allow request with valid token and expose user in context', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signTestToken({ sub: 'user-123', role: 'USER', iat: now, exp: now + 60 });

    const res = await request(app)
      .get('/protected/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.me).toEqual({ id: 'user-123', role: 'USER' });
  });

  it('should return 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/protected/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return 401 when token is malformed', async () => {
    const res = await request(app)
      .get('/protected/me')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('should return 401 when signature is invalid', async () => {
    const now = Math.floor(Date.now() / 1000);
    // Sign with a different secret (HS256 expected by default)
    const badToken = jwt.sign(
      { sub: 'user-456', role: 'USER', iat: now, exp: now + 60 },
      'wrong-secret',
      { algorithm: 'HS256' }
    );

    const res = await request(app)
      .get('/protected/me')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });

  it('should return 401 when token is expired', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = signTestToken({ sub: 'user-789', role: 'USER', iat: now - 120, exp: now - 60 });

    const res = await request(app)
      .get('/protected/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
  });
});
