import { requireAuth } from '../middleware/auth.middleware';
import { signAccessToken } from '../config/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { signExpiredAccessToken, signInvalidAccessToken } from './test-utils';

describe('Auth Middleware - requireAuth', () => {
  function mockRes() {
    const res: any = {};
    res.statusCode = 200;
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (body: any) => {
      res.body = body;
      return res;
    };
    return res;
  }

  it('allows request with valid token and sets req.user', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'USER' });
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res as any, next as any);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(req.user?.id).toBe('user-1');
    expect(req.user?.role).toBe('USER');
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 for invalid signature', () => {
    const bad = signInvalidAccessToken('user-1');
    const req = { headers: { authorization: `Bearer ${bad}` } } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for expired token', () => {
    const expired = signExpiredAccessToken('user-1');
    const req = { headers: { authorization: `Bearer ${expired}` } } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
