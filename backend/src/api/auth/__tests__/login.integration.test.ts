/*
  Integration tests for /api/auth/login using framework-agnostic loginHandler.
  We mock the DB like in signup tests and inject a fake hashing provider via password.service hooks.
*/

// Declare jest to satisfy TypeScript without @types/jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

import { __resetHashProvidersForTests, __setHashProvidersForTests } from '../../../security/password.service';

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

function setupDbMock() {
  type UserRow = {
    id: string;
    email: string;
    password_hash: string;
    status: string;
    verification_token: string | null;
    verification_expires_at: string | null;
    created_at: string;
    updated_at: string;
  };

  const dbState = {
    users: [] as UserRow[],
    idCounter: 1,
  };

  function nowIso(): string {
    return new Date().toISOString();
  }

  function makeId(): string {
    return `mock-${dbState.idCounter++}`;
  }

  const dbModuleFactory = () => ({
    getDbPool() {
      return null;
    },
    async query(text: string, params?: any[]) {
      const sql = String(text).trim().toLowerCase();
      if (sql.startsWith('insert into users')) {
        const email: string = (params && params[0]) || '';
        const passwordHash: string = (params && params[1]) || '';
        const status: string = (params && params[2]) || 'ACTIVE';
        const exists = dbState.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          const err: any = new Error('unique violation');
          err.code = '23505';
          throw err;
        }
        const row: UserRow = {
          id: makeId(),
          email,
          password_hash: passwordHash,
          status,
          verification_token: null,
          verification_expires_at: null,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        dbState.users.push(row);
        return { rows: [row] };
      }

      if (sql.startsWith('select * from users where email =')) {
        const email: string = (params && params[0]) || '';
        const found = dbState.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        return { rows: found ? [found] : [] };
      }

      throw new Error(`Query not implemented in mock DB: ${text}`);
    },
    __reset() {
      dbState.users = [];
      dbState.idCounter = 1;
    },
    __getUsers() {
      return dbState.users.slice();
    },
  });

  const absPath = (require as any).resolve('../../../db/client');
  jest.mock(absPath, dbModuleFactory, { virtual: false });
  const dbClient = require(absPath);
  return dbClient;
}

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

describe('Auth login endpoint integration', () => {
  beforeAll(() => {
    __setHashProvidersForTests({ argon2: fakeArgon2 });
    process.env.PASSWORD_HASH_ALGO = 'argon2';
    process.env.JWT_SECRET = 'secret-login';
  });
  afterAll(() => {
    __resetHashProvidersForTests();
  });

  test('1) valid login returns 200 with tokens', async () => {
    jest.resetModules();
    const db = setupDbMock();
    db.__reset();
    const { signupHandler } = require('../auth.controller');
    const { loginHandler } = require('../login.controller');

    // create user first via signup with a policy-compliant password
    await signupHandler({ body: { email: 'user@example.com', password: 'ValidPass1!' } }, makeRes());

    const res = makeRes();
    await loginHandler({ body: { email: 'user@example.com', password: 'ValidPass1!' } }, res);
    expect(res.data.statusCode).toBe(200);
    expect(res.data.body && res.data.body.accessToken).toBeDefined();
    expect(res.data.body && res.data.body.refreshToken).toBeDefined();
  });

  test('2) unknown email returns 401', async () => {
    jest.resetModules();
    const db = setupDbMock();
    db.__reset();
    const { loginHandler } = require('../login.controller');

    const res = makeRes();
    await loginHandler({ body: { email: 'missing@example.com', password: 'ValidPass1!' } }, res);
    expect(res.data.statusCode).toBe(401);
    expect(res.data.body && res.data.body.error).toBe('invalid_credentials');
  });

  test('3) wrong password returns 401', async () => {
    jest.resetModules();
    const db = setupDbMock();
    db.__reset();
    const { signupHandler } = require('../auth.controller');
    const { loginHandler } = require('../login.controller');

    await signupHandler({ body: { email: 'user2@example.com', password: 'ValidPass1!' } }, makeRes());

    const res = makeRes();
    await loginHandler({ body: { email: 'user2@example.com', password: 'WrongPass1!' } }, res);
    expect(res.data.statusCode).toBe(401);
  });

  test('4) disabled account returns 403', async () => {
    jest.resetModules();
    const db = setupDbMock();
    db.__reset();
    const { signupHandler } = require('../auth.controller');
    const { loginHandler } = require('../login.controller');

    // Create user and then modify status directly in mock DB
    await signupHandler({ body: { email: 'block@example.com', password: 'ValidPass1!' } }, makeRes());
    const users = db.__getUsers();
    users[0].status = 'DISABLED';

    const res = makeRes();
    await loginHandler({ body: { email: 'block@example.com', password: 'ValidPass1!' } }, res);
    expect(res.data.statusCode).toBe(403);
    expect(res.data.body && res.data.body.error).toBe('account_inactive');
  });

  test('5) invalid inputs return 400', async () => {
    jest.resetModules();
    setupDbMock();
    const { loginHandler } = require('../login.controller');

    const r1 = makeRes();
    await loginHandler({ body: { email: 'bad', password: '123456' } }, r1);
    expect(r1.data.statusCode).toBe(400);

    const r2 = makeRes();
    await loginHandler({ body: { email: 'user@example.com', password: '123' } }, r2);
    expect(r2.data.statusCode).toBe(400);
  });
});
