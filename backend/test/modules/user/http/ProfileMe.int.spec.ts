import * as express from 'express';
const request = require('supertest');
import { jwtAuthGuard } from '../../../../src/modules/auth/http';
import { JwtService } from '../../../../src/core/security/JwtService';

function buildApp(jwt: JwtService) {
  const app = express();
  app.get('/api/auth/me', jwtAuthGuard({ jwt }), (req: any, res: any) => {
    const user = req.user || null;
    if (!user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    return res.json({ success: true, data: { id: user.id, email: user.email, roles: user.roles || [] } });
  });
  return app;
}

describe('User Profile - GET /api/auth/me', () => {
  it('returns profile data for authenticated user', async () => {
    const jwt = new JwtService({ issuer: 'iss', audience: 'aud', accessSecret: 'S-TEST', accessTtl: '60s' });
    const app = buildApp(jwt);

    const { token } = jwt.signAccessToken('user-123', 'user123@example.com', ['USER']);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data).toMatchObject({ id: 'user-123', email: 'user123@example.com' });
  });

  it('rejects when token is missing', async () => {
    const jwt = new JwtService({ issuer: 'iss', audience: 'aud', accessSecret: 'S-TEST', accessTtl: '60s' });
    const app = buildApp(jwt);

    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body?.success).toBe(false);
  });

  it('rejects when token signature is invalid', async () => {
    const signer = new JwtService({ issuer: 'iss', audience: 'aud', accessSecret: 'S-ONE', accessTtl: '60s' });
    const verifier = new JwtService({ issuer: 'iss', audience: 'aud', accessSecret: 'S-TWO', accessTtl: '60s' });
    const app = buildApp(verifier);

    const { token } = signer.signAccessToken('u', 'u@example.com');

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body?.success).toBe(false);
  });
});

// Pending specs for future profile update endpoints (placeholder for TDD)
describe.skip('User Profile - UPDATE /api/profile', () => {
  it('updates profile with valid data and persists changes', async () => {
    // To be implemented when update endpoint exists
  });

  it('rejects invalid profile data (too long names, invalid avatar, etc.)', async () => {
    // To be implemented when validation rules are available
  });

  it('prevents a user from modifying another user\'s profile', async () => {
    // To be implemented when endpoint/authorization is available
  });
});
