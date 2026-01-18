import * as express from 'express';
const request = require('supertest');
import { jwtAuthGuard, requireRoles } from '../../../../src/modules/auth/http';
import { JwtService } from '../../../../src/core/security/JwtService';

function buildApp(jwt: JwtService, rolesRequired?: string[]) {
  const app = express();
  const guard = rolesRequired && rolesRequired.length > 0 ? requireRoles(...rolesRequired) : jwtAuthGuard({ jwt });
  app.get('/protected', jwtAuthGuard({ jwt }), (req: any, res: any) => {
    res.json({ success: true, user: req.user });
  });
  app.get('/role-protected', guard, (req: any, res: any) => {
    res.json({ ok: true, user: req.user });
  });
  return app;
}

describe('JWT Guard - expiry, issuer/audience, roles', () => {
  it('rejects expired token with 401', async () => {
    const jwt = new JwtService({ issuer: 'i', audience: 'a', accessSecret: 'S1', accessTtl: '1s' });
    const app = buildApp(jwt);
    const before = Date.now();
    const { token } = jwt.signAccessToken('u1', 'u1@example.com');

    const spy = jest.spyOn(Date, 'now').mockReturnValue(before + 2000);
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    spy.mockRestore();

    expect(res.status).toBe(401);
    expect(res.body?.success).toBe(false);
    expect(res.body?.error?.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects when issuer mismatch', async () => {
    const signer = new JwtService({ issuer: 'iss-1', audience: 'aud', accessSecret: 'S1', accessTtl: '60s' });
    const verifier = new JwtService({ issuer: 'iss-2', audience: 'aud', accessSecret: 'S1', accessTtl: '60s' });
    const app = buildApp(verifier);

    const { token } = signer.signAccessToken('u', 'u@example.com');
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('TOKEN_INVALID_ISSUER');
  });

  it('rejects when audience mismatch', async () => {
    const signer = new JwtService({ issuer: 'iss', audience: 'aud-1', accessSecret: 'S1', accessTtl: '60s' });
    const verifier = new JwtService({ issuer: 'iss', audience: 'aud-2', accessSecret: 'S1', accessTtl: '60s' });
    const app = buildApp(verifier);

    const { token } = signer.signAccessToken('u', 'u@example.com');
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('TOKEN_INVALID_AUDIENCE');
  });

  it('propagates user and roles to req.user and enforces roles', async () => {
    const jwt = new JwtService({ issuer: 'i', audience: 'a', accessSecret: 'S1', accessTtl: '60s' });
    const app = buildApp(jwt, ['ADMIN']);

    const tokenUser = jwt.signAccessToken('u-roles', 'roles@example.com', ['USER', 'ADMIN']).token;
    const resOk = await request(app).get('/role-protected').set('Authorization', `Bearer ${tokenUser}`);
    expect(resOk.status).toBe(200);
    expect(resOk.body?.user).toBeTruthy();
    expect(resOk.body?.user?.roles).toContain('ADMIN');

    const tokenNoRole = jwt.signAccessToken('u-roles2', 'roles2@example.com', ['USER']).token;
    const resForbidden = await request(app).get('/role-protected').set('Authorization', `Bearer ${tokenNoRole}`);
    expect(resForbidden.status).toBe(403);
  });
});
