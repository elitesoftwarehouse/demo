/* Additional integration tests for refresh endpoint focusing on revocation/rotation */

// declare jest
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

  function nowIso(): string { return new Date().toISOString(); }
  function makeId(): string { return `mock-${dbState.idCounter++}`; }

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

      throw new Error(`Query not implemented: ${text}`);
    },
    __reset() { dbState.users = []; dbState.sessions = []; dbState.idCounter = 1; },
  });

  const absPath = (require as any).resolve('../../../db/client');
  jest.mock(absPath, dbModuleFactory, { virtual: false });
  const dbClient = require(absPath);
  return dbClient;
}

describe('Refresh endpoint - rotation and revocation', () => {
  beforeAll(() => {
    __setHashProvidersForTests({ argon2: fakeArgon2 });
    process.env.PASSWORD_HASH_ALGO = 'argon2';
    process.env.JWT_SECRET = 'refresh-extra';
    process.env.JWT_ACCESS_TTL = '60s';
    process.env.JWT_REFRESH_TTL = '3600s';
  });
  afterAll(() => { __resetHashProvidersForTests(); });

  test('after refresh, old refresh token no longer works and new one is persisted', async () => {
    jest.resetModules();
    const db = setupDbMock();
    db.__reset();

    const { signupHandler } = require('../auth.controller');
    const { loginHandler } = require('../login.controller');
    const { refreshHandler } = require('../refresh.controller');

    await signupHandler({ body: { email: 'aa@bb.cc', password: 'P@ss12abc' } }, { status: () => ({ json: () => {} }) } as any);

    const resLogin: any = { statusCode: 0, body: undefined, status(c: number){ this.statusCode=c; return this; }, json(p: any){ this.body=p; } };
    await loginHandler({ body: { email: 'aa@bb.cc', password: 'P@ss12abc' } }, resLogin);

    const oldRefresh = resLogin.body.refreshToken;

    const resRef: any = { statusCode: 0, body: undefined, status(c: number){ this.statusCode=c; return this; }, json(p: any){ this.body=p; } };
    await refreshHandler({ body: { refreshToken: oldRefresh } }, resRef);
    expect(resRef.statusCode).toBe(200);
    const newRefresh = resRef.body.refreshToken;

    const resOld: any = { statusCode: 0, body: undefined, status(c: number){ this.statusCode=c; return this; }, json(p: any){ this.body=p; } };
    await refreshHandler({ body: { refreshToken: oldRefresh } }, resOld);
    expect(resOld.statusCode).toBe(401);

    // New refresh should work
    const resNew: any = { statusCode: 0, body: undefined, status(c: number){ this.statusCode=c; return this; }, json(p: any){ this.body=p; } };
    await refreshHandler({ body: { refreshToken: newRefresh } }, resNew);
    expect(resNew.statusCode).toBe(200);
  });
});
