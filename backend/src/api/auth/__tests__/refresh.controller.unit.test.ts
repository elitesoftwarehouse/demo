import { refreshHandler } from '../refresh.controller';

// declare jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

jest.mock('../../../security/jwt.service', () => ({
  verifyJwt: jest.fn(),
  signAccessToken: jest.fn(() => ({ token: 'new-access', expiresAt: new Date('2030-01-01T00:00:00Z') })),
  signRefreshToken: jest.fn(() => ({ token: 'new-refresh', expiresAt: new Date('2031-01-01T00:00:00Z') })),
  hashRefreshToken: jest.fn((t: string) => `h:${t}`),
}));

jest.mock('../../../modules/sessions/session.repository', () => ({
  findActiveSessionByHash: jest.fn(),
  rotateSessionToken: jest.fn(),
}));

const { verifyJwt } = require('../../../security/jwt.service');
const { findActiveSessionByHash, rotateSessionToken } = require('../../../modules/sessions/session.repository');

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; },
  };
  return res;
}

describe('refreshHandler - unit', () => {
  beforeAll(() => { process.env.JWT_SECRET = 'unit-refresh'; });

  it('400 when refreshToken missing', async () => {
    const res = makeRes();
    await refreshHandler({ body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it('401 when token invalid', async () => {
    (verifyJwt as any).mockReturnValueOnce({ valid: false });
    const res = makeRes();
    await refreshHandler({ body: { refreshToken: 'x' } }, res);
    expect(res.statusCode).toBe(401);
  });

  it('200 on valid token and active session (rotation)', async () => {
    (verifyJwt as any).mockReturnValueOnce({ valid: true, payload: { sub: 'u1', email: 'u@ex.com', typ: 'refresh' } });
    (findActiveSessionByHash as any).mockResolvedValueOnce({ id: 's1', userId: 'u1' });
    (rotateSessionToken as any).mockResolvedValueOnce({ id: 's1' });

    const res = makeRes();
    await refreshHandler({ body: { refreshToken: 'token' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body && res.body.accessToken).toBe('new-access');
    expect(res.body && res.body.refreshToken).toBe('new-refresh');
  });
});
