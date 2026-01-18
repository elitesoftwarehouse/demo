import { JwtService } from '../../../src/core/security/JwtService';

describe('JwtService', () => {
  it('signs and verifies a valid access token', () => {
    const jwt = new JwtService({ issuer: 'iss', audience: 'aud', accessSecret: 'secret-A', accessTtl: '2m' });
    const res = jwt.signAccessToken('user-1', 'user@example.com', ['USER']);

    expect(res.token).toBeTruthy();
    expect(res.expiresIn).toBeGreaterThan(0);

    const payload = jwt.verifyAccessToken(res.token);
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('user@example.com');
    expect(payload.iss).toBe('iss');
    expect(payload.aud).toBe('aud');
    expect(Array.isArray(payload.roles) || payload.roles === undefined).toBe(true);
  });

  it('fails verification with invalid signature', () => {
    const signer = new JwtService({ issuer: 'iss', audience: 'aud', accessSecret: 'secret-A', accessTtl: '2m' });
    const verifier = new JwtService({ issuer: 'iss', audience: 'aud', accessSecret: 'secret-B', accessTtl: '2m' });

    const { token } = signer.signAccessToken('u', 'u@example.com');

    try {
      verifier.verifyAccessToken(token);
      throw new Error('expected to throw');
    } catch (e: any) {
      expect(e.code).toBe('TOKEN_INVALID_SIGNATURE');
    }
  });

  it('fails verification for malformed token', () => {
    const jwt = new JwtService({ accessSecret: 'x' });
    try {
      jwt.verifyAccessToken('malformed');
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe('TOKEN_MALFORMED');
    }
  });

  it('fails verification for expired token', () => {
    const jwt = new JwtService({ issuer: 'iss', audience: 'aud', accessSecret: 'secret-A', accessTtl: '1s' });
    const { token } = jwt.signAccessToken('u', 'u@example.com');

    const realNow = Date.now;
    const now = realNow();
    // advance time by 2 seconds
    // @ts-ignore
    Date.now = () => now + 2000;

    try {
      jwt.verifyAccessToken(token);
      throw new Error('expected expired');
    } catch (e: any) {
      expect(e.code).toBe('TOKEN_EXPIRED');
    } finally {
      // @ts-ignore restore
      Date.now = realNow;
    }
  });
});
