import * as express from 'express';
const request = require('supertest');
import { jwtAuthGuard } from '../../../../src/modules/auth/http';
import { JwtService } from '../../../../src/core/security/JwtService';

function buildApp(jwt: JwtService) {
  const app = express();
  app.get('/protected', jwtAuthGuard({ jwt }), (req: any, res: any) => {
    res.json({ success: true, user: req.user });
  });
  return app;
}

describe('JWT Auth Guard middleware', () => {
  it('allows access with valid token', async () => {
    const jwt = new JwtService({ issuer: 'i', audience: 'a', accessSecret: 'S1', accessTtl: '60s' });
    const app = buildApp(jwt);
    const { token } = jwt.signAccessToken('uid-1', 'u@example.com');

    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty('id', 'uid-1');
  });

  it('rejects when token is missing', async () => {
    const jwt = new JwtService({ accessSecret: 'S1' });
    const app = buildApp(jwt);
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  it('rejects when token signature is wrong', async () => {
    const signer = new JwtService({ issuer: 'i', audience: 'a', accessSecret: 'S1', accessTtl: '60s' });
    const verifier = new JwtService({ issuer: 'i', audience: 'a', accessSecret: 'S2', accessTtl: '60s' });
    const app = buildApp(verifier);

    const { token } = signer.signAccessToken('uid-1', 'u@example.com');
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect([401, 403]).toContain(res.status);
  });

  it('rejects when token expired', async () => {
    const jwt = new JwtService({ issuer: 'i', audience: 'a', accessSecret: 'S1', accessTtl: '1s' });
    const app = buildApp(jwt);
    const { token } = jwt.signAccessToken('uid', 'u@example.com');

    const realNow = Date.now;
    const now = realNow();
    // @ts-ignore
    Date.now = () => now + 3000;
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    // @ts-ignore
    Date.now = realNow;

    expect(res.status).toBe(401);
  });
});
