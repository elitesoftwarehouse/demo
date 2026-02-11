import { decodeJwt, getJwtConfig, hashRefreshToken, signAccessToken, signJwt, signRefreshToken, verifyJwt } from '../jwt.service';

// declare jest for TS without types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

describe('jwt.service - sign/verify/expiry/errors', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'super-secret';
    process.env.JWT_ISSUER = 'smartdesk';
    process.env.JWT_AUDIENCE = 'pwa';
    process.env.JWT_ACCESS_TTL = '60s';
    process.env.JWT_REFRESH_TTL = '7d';
  });

  test('getJwtConfig reads env and provides defaults', () => {
    const cfg = getJwtConfig();
    expect(cfg.secret).toBe('super-secret');
    expect(cfg.issuer).toBe('smartdesk');
    expect(cfg.audience).toBe('pwa');
    expect(typeof cfg.accessTtlSec).toBe('number');
    expect(typeof cfg.refreshTtlSec).toBe('number');
  });

  test('signJwt -> verifyJwt succeeds and payload contains standard claims', () => {
    const { token, expiresAt } = signJwt({ sub: 'u1', email: 'user@example.com', roles: ['user'] }, 120);
    expect(typeof token).toBe('string');
    expect(expiresAt).toBeInstanceOf(Date);

    const ver = verifyJwt(token);
    expect(ver.valid).toBe(true);
    expect(ver.payload).toBeDefined();
    expect(ver.payload && ver.payload.sub).toBe('u1');
    expect(ver.payload && ver.payload.email).toBe('user@example.com');
    expect(Array.isArray(ver.payload && (ver.payload as any).roles)).toBe(true);
    // issuer/audience present per env
    expect(ver.payload && ver.payload.iss).toBe('smartdesk');
    expect(ver.payload && ver.payload.aud).toBe('pwa');
  });

  test('access/refresh helpers produce tokens with different TTL and refresh typ claim', () => {
    const access = signAccessToken({ id: 'u2', email: 'a@b.c' });
    const refresh = signRefreshToken({ id: 'u2', email: 'a@b.c' });
    expect(typeof access.token).toBe('string');
    expect(typeof refresh.token).toBe('string');
    expect(access.expiresAt.getTime()).toBeLessThan(refresh.expiresAt.getTime());
    const decRefresh = decodeJwt(refresh.token) as any;
    expect(decRefresh.typ).toBe('refresh');
  });

  test('verifyJwt detects invalid signature', () => {
    const { token } = signJwt({ sub: 'u3', email: 'u3@ex.com' }, 60);
    // verify with wrong secret via cfgOverride
    const ver = verifyJwt(token, { secret: 'wrong-secret' } as any);
    expect(ver.valid).toBe(false);
    expect(ver.error).toBe('signature');
  });

  test('expired token is rejected (ttl=0)', () => {
    const { token } = signJwt({ sub: 'u4', email: 'u4@ex.com' }, 0);
    const ver = verifyJwt(token);
    expect(ver.valid).toBe(false);
    expect(ver.error).toBe('expired');
  });

  test('decodeJwt returns payload without verifying signature', () => {
    const { token } = signJwt({ sub: 'u5', email: 'u5@ex.com' }, 10);
    const parts = token.split('.');
    // tamper signature
    const tampered = `${parts[0]}.${parts[1]}.xxxx`;
    const payload = decodeJwt(tampered);
    expect(payload && payload.sub).toBe('u5');
  });

  test('hashRefreshToken is deterministic and non-reversible', () => {
    const t = 'some-refresh-token';
    const h1 = hashRefreshToken(t);
    const h2 = hashRefreshToken(t);
    expect(h1).toBe(h2);
    expect(typeof h1).toBe('string');
    expect(h1).not.toContain(t);
  });
});
