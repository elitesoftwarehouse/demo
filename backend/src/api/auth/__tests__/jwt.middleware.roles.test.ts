import { authGuard, requireRoles, type AuthenticatedRequestLike } from '../jwt.middleware';
import { signAccessToken } from '../../../security/jwt.service';

// declare jest for TS without types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

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

describe('authGuard + requireRoles', () => {
  beforeAll(() => { process.env.JWT_SECRET = 'roles-secret'; });

  test('forbidden when required role missing', async () => {
    const access = signAccessToken({ id: 'u1', email: 'u@ex.com', roles: ['user'] });
    const guard = authGuard({ roles: ['admin'] });
    const req = makeReq({ authorization: `Bearer ${access.token}` });
    const res = makeRes();
    await guard(req, res as any, () => {});
    expect(res.data.statusCode).toBe(403);
    expect(res.data.body && res.data.body.message).toBe('insufficient_role');
  });

  test('requireRoles works after authGuard', async () => {
    const access = signAccessToken({ id: 'u1', email: 'u@ex.com', roles: ['admin'] });
    const guard = authGuard();
    const req = makeReq({ Authorization: `Bearer ${access.token}` });
    const res = makeRes();

    let passedGuard = false;
    await guard(req, res as any, () => { passedGuard = true; });
    expect(passedGuard).toBe(true);

    const rolesMw = requireRoles(['admin']);
    let nextCalled = false;
    await rolesMw(req, res as any, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});
