import { authGuard, type AuthenticatedRequestLike } from '../jwt.middleware';
import { signAccessToken, signJwt } from '../../../security/jwt.service';

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

describe('authGuard middleware integration', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'mw-secret';
    process.env.JWT_ACCESS_TTL = '60s';
  });

  test('allows access with valid access token and sets req.user', async () => {
    const access = signAccessToken({ id: 'u1', email: 'user@example.com' });
    const guard = authGuard();
    const req = makeReq({ Authorization: `Bearer ${access.token}` });
    const res = makeRes();

    let nextCalled = false;
    await guard(req, res as any, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.user && req.user.id).toBe('u1');
    expect(req.user && req.user.email).toBe('user@example.com');
  });

  test('rejects when token missing', async () => {
    const guard = authGuard();
    const req = makeReq();
    const res = makeRes();
    await guard(req, res as any, () => {});
    expect(res.data.statusCode).toBe(401);
    expect(res.data.body && res.data.body.message).toBe('missing_token');
  });

  test('rejects expired token', async () => {
    const { token } = signJwt({ sub: 'u2', email: 'a@b.c' }, 0);
    const guard = authGuard();
    const req = makeReq({ authorization: `Bearer ${token}` });
    const res = makeRes();
    await guard(req, res as any, () => {});
    expect(res.data.statusCode).toBe(401);
    expect(res.data.body && res.data.body.message).toBe('token_expired');
  });

  test('rejects token with wrong signature', async () => {
    const { token } = signJwt({ sub: 'u3', email: 'x@y.z' }, 60);
    // Manually alter environment for verification path by using a custom incorrect Authorization token
    // Instead, we simulate a wrong signature by altering the token string
    const bad = token.split('.');
    bad[2] = 'invalidsig';
    const tampered = bad.join('.');

    const guard = authGuard();
    const req = makeReq({ authorization: `Bearer ${tampered}` });
    const res = makeRes();
    await guard(req, res as any, () => {});
    expect(res.data.statusCode).toBe(401);
    expect(res.data.body && res.data.body.message).toBe('invalid_signature');
  });

  test('rejects refresh tokens by default', async () => {
    // Create a refresh token by setting typ manually via signJwt and long ttl
    const { token } = signJwt({ sub: 'u4', email: 'r@t.ok', typ: 'refresh' } as any, 60 * 60);
    const guard = authGuard();
    const req = makeReq({ authorization: `Bearer ${token}` });
    const res = makeRes();
    await guard(req, res as any, () => {});
    expect(res.data.statusCode).toBe(401);
    expect(res.data.body && res.data.body.message).toBe('invalid_token_type');
  });
});
