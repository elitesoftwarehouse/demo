import { loginHandler } from '../login.controller';
import { __setHashProvidersForTests, __resetHashProvidersForTests } from '../../../security/password.service';

// declare jest for TS without types
declare const jest: any;

// Fake argon2 provider compatible with password.service tests
function simpleEncode(s: string): string {
  return s
    .split('')
    .map((c) => c.charCodeAt(0).toString(16))
    .join('-');
}
const fakeArgon2 = {
  async hash(plain: string): Promise<string> {
    const salt = 'salt';
    return `$argon2id$${salt}$${simpleEncode(plain + ':' + salt)}`;
  },
  async verify(hash: string, plain: string): Promise<boolean> {
    if (!hash.startsWith('$argon2')) return false;
    const salt = 'salt';
    const expected = `$argon2id$${salt}$${simpleEncode(plain + ':' + salt)}`;
    return hash === expected;
  },
  argon2id: 2,
};

// Mock repository and jwt service
jest.mock('../../../modules/users/user.repository', () => ({
  findUserByEmail: jest.fn(),
}));

jest.mock('../../../security/jwt.service', () => ({
  signAccessToken: jest.fn(() => ({ token: 'access', expiresAt: new Date('2030-01-01T00:00:00Z') })),
  signRefreshToken: jest.fn(() => ({ token: 'refresh', expiresAt: new Date('2031-01-01T00:00:00Z') })),
  hashRefreshToken: jest.fn(() => 'hash'),
}));

const { findUserByEmail } = require('../../../modules/users/user.repository');

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
    },
  };
  return res;
}

describe('loginHandler', () => {
  beforeAll(() => {
    __setHashProvidersForTests({ argon2: fakeArgon2 });
    process.env.PASSWORD_HASH_ALGO = 'argon2';
    process.env.JWT_SECRET = 'secret';
  });
  afterAll(() => {
    __resetHashProvidersForTests();
  });

  it('returns 400 on invalid input', async () => {
    const res = makeRes();
    await loginHandler({ body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 on invalid credentials', async () => {
    (findUserByEmail as any).mockResolvedValueOnce(null);
    const res = makeRes();
    await loginHandler({ body: { email: 'a@b.c', password: 'x' } }, res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 200 and tokens on valid login', async () => {
    (findUserByEmail as any).mockResolvedValueOnce({
      id: 'u1',
      email: 'user@example.com',
      passwordHash: await fakeArgon2.hash('P@ssw0rd'),
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = makeRes();
    await loginHandler({ body: { email: 'user@example.com', password: 'P@ssw0rd' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });
});
