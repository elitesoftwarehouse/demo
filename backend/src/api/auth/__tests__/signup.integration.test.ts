/*
  Integration tests for /api/auth/signup using framework-agnostic signupHandler.
  We simulate the DB layer by mocking src/db/client.ts and use a fake Argon2 provider
  injected via password.service test hooks.
*/

// Declare jest to satisfy TypeScript without @types/jest
declare const jest: any;

import { __resetHashProvidersForTests, __setHashProvidersForTests } from '../../../security/password.service';

// Utilities to build a fake argon2 provider similar to unit tests
function simpleEncode(s: string): string {
  return s
    .split('')
    .map((c) => c.charCodeAt(0).toString(16))
    .join('-');
}

const fakeArgon2 = {
  async hash(plain: string, _options?: any): Promise<string> {
    const salt = Math.random().toString(36).slice(2, 10);
    return `$argon2id$${salt}$${simpleEncode(plain + ':' + salt)}`;
  },
  async verify(hash: string, plain: string): Promise<boolean> {
    if (!hash.startsWith('$argon2')) return false;
    const parts = hash.split('$');
    const salt = parts[2] || '';
    const expected = `$argon2id$${salt}$${simpleEncode(plain + ':' + salt)}`;
    return hash === expected;
  },
  argon2id: 2,
};

// Helper to create and install a mock DB module for each test case
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
    failMode: 'none' as 'none' | 'generic',
  };

  function nowIso(): string {
    return new Date().toISOString();
  }

  function makeId(): string {
    const id = `mock-${dbState.idCounter++}`;
    return id;
  }

  const dbModuleFactory = () => {
    return {
      // match the real module API
      getDbPool() {
        return null;
      },
      async query(text: string, params?: any[]) {
        // Simulate generic DB failure when requested
        if (dbState.failMode === 'generic') {
          const err: any = new Error('DB failure');
          err.code = 'XX000';
          throw err;
        }

        const sql = String(text).trim().toLowerCase();
        if (sql.startsWith('insert into users')) {
          const email: string = (params && params[0]) || '';
          const passwordHash: string = (params && params[1]) || '';
          const status: string = (params && params[2]) || 'ACTIVE';

          // Unique by email (case-insensitive like CITEXT)
          const exists = dbState.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
          if (exists) {
            const err: any = new Error('unique violation: users(email)');
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
      // Test-only helpers
      __reset() {
        dbState.users = [];
        dbState.idCounter = 1;
        dbState.failMode = 'none';
      },
      __setFailMode(mode: 'none' | 'generic') {
        dbState.failMode = mode;
      },
      __getUsers() {
        return dbState.users.slice();
      },
    };
  };

  // Install the mock before requiring modules
  const absPath = (require as any).resolve('../../../db/client');
  jest.mock(absPath, dbModuleFactory, { virtual: false });

  // Return handles to interact with the mocked module
  // Important: require AFTER jest.mock to get the mocked exports
  const dbClient = require(absPath);
  return dbClient;
}

// Simple Express-like response mock
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
  };
}

describe('Auth signup endpoint integration', () => {
  beforeAll(() => {
    __setHashProvidersForTests({ argon2: fakeArgon2 });
    process.env.PASSWORD_HASH_ALGO = 'argon2';
  });
  afterAll(() => {
    __resetHashProvidersForTests();
  });

  test('1) successful signup returns 201 and creates user with non-null hash', async () => {
    jest.resetModules();
    const db = setupDbMock();
    db.__reset();

    const { signupHandler } = require('../auth.controller');

    const req = { body: { email: 'user@example.com', password: 'ValidPass1!' } };
    const res = makeRes();

    await signupHandler(req, res as any);

    expect(res.data.statusCode).toBe(201);
    expect(res.data.body && res.data.body.user).toBeDefined();
    expect(res.data.body.user.email).toBe('user@example.com');
    // Sensitive fields must not be present
    expect((res.data.body.user as any).passwordHash).toBeUndefined();
    expect((res.data.body.user as any).verificationToken).toBeUndefined();
    expect('password' in res.data.body.user).toBe(false);
    expect('salt' in res.data.body.user).toBe(false);

    // Validate DB state
    const users = db.__getUsers();
    expect(users.length).toBe(1);
    expect(users[0].email).toBe('user@example.com');
    expect(typeof users[0].password_hash).toBe('string');
    expect(users[0].password_hash.length).toBeGreaterThan(10);
  });

  test('2) duplicate email returns 409 and does not create a second user', async () => {
    jest.resetModules();
    const db = setupDbMock();
    db.__reset();

    const { signupHandler } = require('../auth.controller');

    const res1 = makeRes();
    await signupHandler({ body: { email: 'dup@example.com', password: 'ValidPass1!' } }, res1 as any);
    expect(res1.data.statusCode).toBe(201);

    const res2 = makeRes();
    // Try with different case to ensure case-insensitive uniqueness
    await signupHandler({ body: { email: 'DUP@example.com', password: 'ValidPass1!' } }, res2 as any);
    expect(res2.data.statusCode).toBe(409);

    const users = db.__getUsers();
    expect(users.length).toBe(1);
  });

  test('3) missing payload or fields returns 400 with error details', async () => {
    jest.resetModules();
    setupDbMock().__reset();
    const { signupHandler } = require('../auth.controller');

    const r1 = makeRes();
    await signupHandler({ body: {} }, r1 as any);
    expect(r1.data.statusCode).toBe(400);
    expect(r1.data.body && r1.data.body.details && r1.data.body.details.email).toBeDefined();

    const r2 = makeRes();
    await signupHandler({ body: { email: 'user@example.com' } }, r2 as any);
    expect(r2.data.statusCode).toBe(400);
    expect(r2.data.body && r2.data.body.details && r2.data.body.details.password).toBeDefined();
  });

  test('4) invalid email or weak password returns 400', async () => {
    jest.resetModules();
    setupDbMock().__reset();
    const { signupHandler } = require('../auth.controller');

    const r1 = makeRes();
    await signupHandler({ body: { email: 'not-an-email', password: 'ValidPass1!' } }, r1 as any);
    expect(r1.data.statusCode).toBe(400);

    const r2 = makeRes();
    await signupHandler({ body: { email: 'weak@example.com', password: 'short' } }, r2 as any);
    expect(r2.data.statusCode).toBe(400);
  });

  test('5) response must not contain sensitive fields', async () => {
    jest.resetModules();
    setupDbMock().__reset();
    const { signupHandler } = require('../auth.controller');

    const res = makeRes();
    await signupHandler({ body: { email: 'safe@example.com', password: 'ValidPass1!' } }, res as any);
    expect(res.data.statusCode).toBe(201);
    const user = res.data.body.user;
    const sensitiveKeys = ['password', 'passwordHash', 'verificationToken', 'salt'];
    for (const k of sensitiveKeys) {
      expect(k in user).toBe(false);
    }
  });

  test('6) generic DB error returns 500', async () => {
    jest.resetModules();
    const db = setupDbMock();
    db.__reset();
    db.__setFailMode('generic');

    const { signupHandler } = require('../auth.controller');

    const res = makeRes();
    await signupHandler({ body: { email: 'err@example.com', password: 'ValidPass1!' } }, res as any);
    expect(res.data.statusCode).toBe(500);
    expect(res.data.body && res.data.body.error).toBe('internal_error');

    // Ensure no user persisted
    expect(db.__getUsers().length).toBe(0);
  });
});
