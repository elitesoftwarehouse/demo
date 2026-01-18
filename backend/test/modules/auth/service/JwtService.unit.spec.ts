import { JwtService } from '../../../src/core/security/JwtService';

describe('JwtService - unit', () => {
  it('generateRefreshToken returns token and hash and validates hash', () => {
    const jwt = new JwtService({ refreshSecret: 'R-SECRET', refreshBytes: 32 });
    const r = jwt.generateRefreshToken();
    expect(r.token).toBeTruthy();
    expect(r.hash).toBeTruthy();
    expect(typeof r.familyId).toBe('string');

    const h2 = jwt.hashRefreshToken(r.token);
    expect(r.hash).toBe(h2);
  });

  it('parse/verify path: wrong issuer/audience throws specific errors', () => {
    const good = new JwtService({ issuer: 'iss1', audience: 'aud1', accessSecret: 'A', accessTtl: '1m' });
    const badIss = new JwtService({ issuer: 'iss2', audience: 'aud1', accessSecret: 'A', accessTtl: '1m' });
    const badAud = new JwtService({ issuer: 'iss1', audience: 'aud2', accessSecret: 'A', accessTtl: '1m' });

    const { token } = good.signAccessToken('u1', 'u@example.com');

    try {
      badIss.verifyAccessToken(token);
      throw new Error('expected issuer error');
    } catch (e: any) {
      expect(e.code).toBe('TOKEN_INVALID_ISSUER');
    }

    try {
      badAud.verifyAccessToken(token);
      throw new Error('expected audience error');
    } catch (e: any) {
      expect(e.code).toBe('TOKEN_INVALID_AUDIENCE');
    }
  });
});
