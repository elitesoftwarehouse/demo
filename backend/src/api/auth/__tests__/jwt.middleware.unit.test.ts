import { authGuard, type AuthenticatedRequestLike } from '../jwt.middleware';
import { signAccessToken, signJwt, signRefreshToken } from '../../../security/jwt.service';

// declare jest for TS without types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

function makeRes() {
  const store: any = { statusCode: 200, body: undefined };
  return {
    status(code: number) {
      store.statusCode = code;
      return this;
    },
    json(payload: any) {
      store.body = payload;
    },
    get data() {
      return store;
    },
  } as any;
}

function makeReq(headers?: Record<string, string>): AuthenticatedRequestLike {
  return { headers: headers || {} } as any;
}

describe('authGuard middleware - unit tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'unit-mw-secret';
    process.env.JWT_ACCESS_TTL = '60s';
    process.env.JWT_REFRESH_TTL = '600s';
  });

  test('propagates roles and user context from access token', async () => {
    const access = signAccessToken({ id: 'u1', email: 'user@example.com', roles: ['user', 'admin'] });
    const guard = authGuard();
    const req = makeReq({ Authorization: `Bearer ${access.token}` });
    const res = makeRes();

    let nextCalled = false;
    await guard(req, res as any, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.user && req.user.id).toBe('u1');
    expect(req.user && req.user.email).toBe('user@example.com');
    expect(Array.isArray(req.user && req.user.roles)).toBe(true);
    expect(req.user && req.user.roles).toEqual(expect.arrayContaining(['user', 'admin']));
  });

  test('issuer mismatch is mapped to invalid_claim', async () => {
    // Verify expects issuer = expected
    process.env.JWT_ISSUER = 'expected-iss';
    process.env.JWT_AUDIENCE = 'aud-ok';

    // Sign token with wrong issuer by temporarily changing env
    const prevIss = process.env.JWT_ISSUER;
    process.env.JWT_ISSUER = 'wrong-iss';
    const { token } = signJwt({ sub: 'u2', email: 'a@b.c' }, 60);
    // Restore expected issuer for verification
    process.env.JWT_ISSUER = prevIss;

    const guard = authGuard();
    const req = makeReq({ authorization: `Bearer ${token}` });
    const res = makeRes();

    await guard(req, res as any, () => {});
    expect(res.data.statusCode).toBe(401);
    expect(res.data.body && res.data.body.message).toBe('invalid_claim');
  });

  test('audience mismatch is mapped to invalid_claim', async () => {
    process.env.JWT_ISSUER = 'iss-ok';
    process.env.JWT_AUDIENCE = 'expected-aud';

    // Sign token with wrong audience
    const prevAud = process.env.JWT_AUDIENCE;
    process.env.JWT_AUDIENCE = 'wrong-aud';
    const { token } = signJwt({ sub: 'u3', email: 'x@y.z' }, 60);
    process.env.JWT_AUDIENCE = prevAud;

    const guard = authGuard();
    const req = makeReq({ authorization: `Bearer ${token}` });
    const res = makeRes();

    await guard(req, res as any, () => {});
    expect(res.data.statusCode).toBe(401);
    expect(res.data.body && res.data.body.message).toBe('invalid_claim');
  });

  test('allowRefresh option permits refresh tokens', async () => {
    const refresh = signRefreshToken({ id: 'u9', email: 'r@ex.com' });
    const guard = authGuard({ allowRefresh: true });
    const req = makeReq({ Authorization: `Bearer ${refresh.token}` });
    const res = makeRes();

    let passed = false;
    await guard(req, res as any, () => { passed = true; });

    expect(passed).toBe(true);
    expect(req.user && req.user.id).toBe('u9');
  });
});
