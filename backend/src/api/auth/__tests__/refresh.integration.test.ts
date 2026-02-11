/*
  Integration tests for refresh token flow using refreshHandler.
  We mock DB for sessions and users. We verify valid refresh, expired token, rotation, and revocation.
*/

// declare jest for TS
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

import { __resetHashProvidersForTests, __setHashProvidersForTests } from '../../../security/password.service';
import { decodeJwt, signJwt } from '../../../security/jwt.service';

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

  type SessionRow = {
    id: string;
    user_id: string;
    refresh_token_hash: string;
    user_agent: string | null;
    ip_address: string | null;
    created_at: string;
    expires_at: string;
    revoked_at: string | null;
  };

  const dbState = {
    users: [] as UserRow[],
    sessions: [] as SessionRow[],
    idCounter: 1,
  };

  function nowIso(): string {
    return new Date().toISOString();
  }

  function makeId(): string {
    return `mock-${dbState.idCounter++}`;
  }

  const dbModuleFactory = () => ({
    getDbPool() { return null; },
    async query(text: string, params?: any[]) {
      const sql = String(text).trim().toLowerCase();

      if (sql.startsWith('insert into users')) {
        const [email, password_hash, status] = params as any[];
        const exists = dbState.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
        if (exists) { const err: any = new Error('unique violation'); err.code='23505'; throw err; }
        const row: UserRow = { id: makeId(), email, password_hash, status, verification_token: null, verification_expires_at: null, created_at: nowIso(), updated_at: nowIso() };
        dbState.users.push(row);
        return { rows: [row] };
      }

      if (sql.startsWith('select * from users where email =')) {
        const email = String((params && params[0]) || '');
        const found = dbState.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        return { rows: found ? [found] : [] };
      }

      if (sql.startsWith('insert into user_sessions')) {
        const [user_id, refresh_token_hash, user_agent, ip_address, expires_at] = params as any[];
        const row: SessionRow = { id: makeId(), user_id, refresh_token_hash, user_agent, ip_address, created_at: nowIso(), expires_at: (expires_at as Date).toISOString(), revoked_at: null };
        dbState.sessions.push(row);
        return { rows: [row] };
      }

      if (sql.startsWith('select * from user_sessions where refresh_token_hash =')) {
        const tokenHash = String((params && params[0]) || '');
        const now = Date.now();
        const found = dbState.sessions.find((s) => s.refresh_token_hash === tokenHash && !s.revoked_at && new Date(s.expires_at).getTime() > now);
        return { rows: found ? [found] : [] };
      }

      if (sql.startsWith('update user_sessions set refresh_token_hash =')) {
        const [newHash, newExpires, sessionId] = params as any[];
        const idx = dbState.sessions.findIndex((s) => s.id === sessionId);
        if (idx >= 0) {
          dbState.sessions[idx].refresh_token_hash = newHash;
          dbState.sessions[idx].expires_at = (newExpires as Date).toISOString();
        }
        return { rows: idx >= 0 ? [dbState.sessions[idx]] : [] };
      }

      if (sql.startsWith('update user_sessions set revoked_at =')) {
        const [sessionId] = params as any[];
        const idx = dbState.sessions.findIndex((s) => s.id === sessionId);
        if (idx >= 0) { dbState.sessions[idx].revoked_at = nowIso(); }
        return { rows: idx >= 0 ? [dbState.sessions[idx]] : [] };
      }

      if (sql.startsWith('update user_sessions set revoked_at')) {
        const [userId] = params as any[];
        dbState.sessions = dbState.sessions.map((s) => s.user_id === userId ? { ...s, revoked_at: nowIso() } : s);
        return { rows: [] };
      }

      throw new Error(`Query not implemented: ${text}`);
    },
    __reset() { dbState.users = []; dbState.sessions = []; dbState.idCounter = 1; },
    __getSessions() { return dbState.sessions.slice(); },
    __getUsers() { return dbState.users.slice(); },
  });

  const absPath = (require as any).resolve('../../../db/client');
  jest.mock(absPath, dbModuleFactory, { virtual: false });
  const dbClient = require(absPath);
  return dbClient;
}

function makeRes() {
  const store: any = { statusCode: 200, body: undefined };
  return {
    status(code: number) { store.statusCode = code; return this; },
    json(payload: any) { store.body = payload; },
    get data() { return store; },
  } as any;
}

describe('Refresh token flow integration', () => {
  beforeAll(() => {
    __setHashProvidersForTests({ argon2: fakeArgon2 });
    process.env.PASSWORD_HASH_ALGO = 'argon2';
    process.env.JWT_SECRET = 'refresh-secret';
    process.env.JWT_ACCESS_TTL = '60s';
    process.env.JWT_REFRESH_TTL = '3600s';
  });
  afterAll(() => { __resetHashProvidersForTests(); });

  test('1) valid refresh rotates session and issues new tokens', async () => {
    jest.resetModules();
    const db = setupDbMock();
    db.__reset();

    const { signupHandler } = require('../auth.controller');
    const { loginHandler } = require('../login.controller');
    const { refreshHandler } = require('../refresh.controller');

    await signupHandler({ body: { email: 'user@example.com', password: 'P@ssw0rd' } }, makeRes());
    const resLogin = makeRes();
    await loginHandler({ body: { email: 'user@example.com', password: 'P@ssw0rd' } }, resLogin);

    const refreshToken = resLogin.data.body.refreshToken;

    const resRefresh = makeRes();
    await refreshHandler({ body: { refreshToken } }, resRefresh);
    expect(resRefresh.data.statusCode).toBe(200);
    expect(resRefresh.data.body && resRefresh.data.body.accessToken).toBeDefined();
    expect(resRefresh.data.body && resRefresh.data.body.refreshToken).toBeDefined();

    // Old token should be rejected now (rotated), simulate by calling refresh again with old token
    const resOld = makeRes();
    await refreshHandler({ body: { refreshToken } }, resOld);
    expect(resOld.data.statusCode).toBe(401);
  });

  test('2) expired refresh token is rejected', async () => {
    jest.resetModules();
    setupDbMock().__reset();
    const { refreshHandler } = require('../refresh.controller');

    // craft an already-expired refresh token
    const { token } = signJwt({ sub: 'u1', email: 'x@y.z', typ: 'refresh' } as any, 0);
    const res = makeRes();
    await refreshHandler({ body: { refreshToken: token } }, res);
    expect(res.data.statusCode).toBe(401);
    expect(res.data.body && res.data.body.error).toBe('invalid_token');
  });
});
