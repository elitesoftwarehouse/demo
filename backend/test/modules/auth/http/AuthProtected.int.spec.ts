import * as express from 'express';
const request = require('supertest');
import { jwtAuthGuard } from '../../../../src/modules/auth/http';
import { JwtService } from '../../../../src/core/security/JwtService';

function appWithProtected(jwt: JwtService) {
  const app = express();
  app.get('/private/ping', jwtAuthGuard({ jwt }), (req: any, res: any) => res.json({ pong: true }));
  return app;
}

describe('Protected endpoints integration', () => {
  it('returns 401 without token', async () => {
    const jwt = new JwtService({ accessSecret: 'A1' });
    const app = appWithProtected(jwt);
    const res = await request(app).get('/private/ping');
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid token', async () => {
    const jwt = new JwtService({ issuer: 'i', audience: 'a', accessSecret: 'A1', accessTtl: '60s' });
    const app = appWithProtected(jwt);
    const { token } = jwt.signAccessToken('u', 'u@example.com');
    const res = await request(app).get('/private/ping').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.pong).toBe(true);
  });
});
