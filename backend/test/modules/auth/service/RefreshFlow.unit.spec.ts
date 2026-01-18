import { JwtService } from '../../../src/core/security/JwtService';
import { InMemoryRefreshTokenRepository } from '../../../src/modules/auth/repository/InMemoryRefreshTokenRepository';

function advance(ms: number) {
  const now = Date.now();
  return jest.spyOn(Date, 'now').mockReturnValue(now + ms);
}

describe('Refresh token functions - creation, validation, revocation', () => {
  it('creates a refresh token and validates its hash', async () => {
    const jwt = new JwtService({ refreshSecret: 'R-1', refreshBytes: 24, refreshTtl: '10m' });
    const repo = new InMemoryRefreshTokenRepository();

    const r = jwt.generateRefreshToken();
    const rec = await repo.createRefreshToken({
      userId: 'u1',
      tokenHash: r.hash,
      issuedAt: r.issuedAt,
      expiresAt: r.expiresAt,
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
      familyId: r.familyId,
    });

    expect(rec.id).toBeTruthy();
    expect(rec.revokedAt).toBeFalsy();

    const byHash = await repo.findRefreshTokenByHash(jwt.hashRefreshToken(r.token));
    expect(byHash?.id).toBe(rec.id);
  });

  it('revocation marks token as revoked and prevents further use', async () => {
    const jwt = new JwtService({ refreshSecret: 'R-1', refreshBytes: 24, refreshTtl: '10m' });
    const repo = new InMemoryRefreshTokenRepository();
    const r = jwt.generateRefreshToken();
    const rec = await repo.createRefreshToken({
      userId: 'u2', tokenHash: r.hash, issuedAt: r.issuedAt, expiresAt: r.expiresAt, familyId: r.familyId,
    });

    await repo.revokeRefreshToken(rec.id, 'test');
    const fetched = await repo.findRefreshTokenById(rec.id);
    expect(fetched?.revokedAt).toBeTruthy();
  });

  it('cleanup removes expired tokens', async () => {
    const jwt = new JwtService({ refreshSecret: 'R-1', refreshBytes: 24, refreshTtl: '1s' });
    const repo = new InMemoryRefreshTokenRepository();
    const r1 = jwt.generateRefreshToken();
    const r2 = jwt.generateRefreshToken();
    await repo.createRefreshToken({ userId: 'u', tokenHash: r1.hash, issuedAt: r1.issuedAt, expiresAt: r1.expiresAt, familyId: r1.familyId });
    await repo.createRefreshToken({ userId: 'u', tokenHash: r2.hash, issuedAt: r2.issuedAt, expiresAt: r2.expiresAt, familyId: r2.familyId });

    // advance time beyond TTL
    const spy = advance(2000);
    const n = await repo.cleanupExpired(new Date());
    spy.mockRestore();

    expect(n).toBeGreaterThanOrEqual(1);
  });
});
