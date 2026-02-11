import { authGuard, type AuthenticatedRequestLike } from '../../auth/jwt.middleware';
import { signAccessToken } from '../../../security/jwt.service';

// declare jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

// Simulate a protected endpoint handler
function protectedHandler(_req: any, res: any) {
  res.status(200).json({ ok: true });
}

function makeRes() {
  const store: any = { statusCode: 200, body: undefined };
  return {
    status(code: number) { store.statusCode = code; return this; },
    json(payload: any) { store.body = payload; },
    get data() { return store; },
  } as any;
}

function makeReq(headers?: Record<string, string>): AuthenticatedRequestLike {
  return { headers: headers || {} } as any;
}

describe('Protected endpoints with authGuard', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'protected-secret';
    process.env.JWT_ACCESS_TTL = '60s';
  });

  test('returns 401 without token', async () => {
    const guard = authGuard();
    const req = makeReq();
    const res = makeRes();

    let nextCalled = false;
    await guard(req, res as any, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.data.statusCode).toBe(401);
  });

  test('returns 200 with valid token', async () => {
    const guard = authGuard();
    const access = signAccessToken({ id: 'u1', email: 'u@ex.com' });
    const req = makeReq({ Authorization: `Bearer ${access.token}` });
    const res = makeRes();

    let nextCalled = false;
    await guard(req, res as any, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);

    protectedHandler(req as any, res as any);
    expect(res.data.statusCode).toBe(200);
    expect(res.data.body && res.data.body.ok).toBe(true);
  });
});
