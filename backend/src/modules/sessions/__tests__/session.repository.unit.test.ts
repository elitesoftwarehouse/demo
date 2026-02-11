import {
  createUserSession,
  findActiveSessionByHash,
  rotateSessionToken,
  revokeSessionById,
  revokeAllSessionsForUser,
} from '../session.repository';

// declare jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

function setupDbMock() {
  type SessionRow = {
    id: string;
    user_id: string;
    refresh_token_hash: string;
    user_agent: string | null;
    ip_address: string | null;
    created_at: string;
    expires_at: string;
    revoked_at: string | null;
    jti?: string | null;
  };

  const dbState = {
    sessions: [] as SessionRow[],
    idCounter: 1,
  };

  function nowIso(): string { return new Date().toISOString(); }
  function makeId(): string { return `sess-${dbState.idCounter++}`; }

  const dbModuleFactory = () => ({
    getDbPool() { return null; },
    async query(text: string, params?: any[]) {
      const sql = String(text).trim().toLowerCase();
      if (sql.startsWith('insert into user_sessions')) {
        const [user_id, refresh_token_hash, user_agent, ip_address, expires_at, jti] = params as any[];
        const row: SessionRow = {
          id: makeId(), user_id, refresh_token_hash, user_agent, ip_address,
          created_at: nowIso(), expires_at: (expires_at as Date).toISOString(), revoked_at: null, jti,
        };
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
        const [newHash, newExpires, sessionId, userAgent, ipAddress, jti] = params as any[];
        const idx = dbState.sessions.findIndex((s) => s.id === sessionId);
        if (idx >= 0) {
          dbState.sessions[idx].refresh_token_hash = newHash;
          dbState.sessions[idx].expires_at = (newExpires as Date).toISOString();
          dbState.sessions[idx].user_agent = userAgent ?? dbState.sessions[idx].user_agent;
          dbState.sessions[idx].ip_address = ipAddress ?? dbState.sessions[idx].ip_address;
          (dbState.sessions[idx] as any).jti = jti ?? (dbState.sessions[idx] as any).jti ?? null;
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

      if (sql.startsWith('delete from user_sessions where expires_at <=')) {
        const before = dbState.sessions.length;
        const now = Date.now();
        dbState.sessions = dbState.sessions.filter((s) => new Date(s.expires_at).getTime() > now);
        return { rows: [], rowCount: before - dbState.sessions.length } as any;
      }

      throw new Error(`Query not implemented: ${text}`);
    },
    __reset() { dbState.sessions = []; dbState.idCounter = 1; },
    __getSessions() { return dbState.sessions.slice(); },
  });

  const absPath = (require as any).resolve('../../../db/client');
  jest.mock(absPath, dbModuleFactory, { virtual: false });
  const dbClient = require(absPath);
  return dbClient;
}

describe('user_sessions repository - unit', () => {
  beforeAll(() => { process.env.JWT_SECRET = 'sess-secret'; });

  test('create/find/rotate/revoke flow', async () => {
    jest.resetModules();
    const db = setupDbMock();
    db.__reset();

    const now = new Date();
    const expires = new Date(now.getTime() + 60_000);

    const created = await createUserSession({ userId: 'u1', refreshTokenHash: 'h1', expiresAt: expires, userAgent: 'ua', ipAddress: '127.0.0.1', jti: 'j1' });
    expect(created.userId).toBe('u1');

    const found = await findActiveSessionByHash('h1');
    expect(found && found.userId).toBe('u1');

    const newExpires = new Date(now.getTime() + 120_000);
    const rotated = await rotateSessionToken(created.id, 'h2', newExpires, { userAgent: 'ua2', ipAddress: '10.0.0.1', jti: 'j2' });
    expect(rotated && rotated.refreshTokenHash).toBe('h2');

    const shouldNotFindOld = await findActiveSessionByHash('h1');
    expect(shouldNotFindOld).toBeNull();

    const foundNew = await findActiveSessionByHash('h2');
    expect(foundNew && foundNew.id).toBe(created.id);

    await revokeSessionById(created.id);
    const afterRevoke = await findActiveSessionByHash('h2');
    expect(afterRevoke).toBeNull();

    // Create two sessions and revoke all for user
    db.__reset();
    const ex1 = new Date(Date.now() + 3600_000);
    const ex2 = new Date(Date.now() + 7200_000);
    await createUserSession({ userId: 'u2', refreshTokenHash: 'hu2-1', expiresAt: ex1 });
    await createUserSession({ userId: 'u2', refreshTokenHash: 'hu2-2', expiresAt: ex2 });

    const { revokeAllSessionsForUser, deleteExpiredSessions } = require('../session.repository');
    await revokeAllSessionsForUser('u2');
    expect(await findActiveSessionByHash('hu2-1')).toBeNull();
    expect(await findActiveSessionByHash('hu2-2')).toBeNull();

    // test deleteExpiredSessions
    db.__reset();
    await createUserSession({ userId: 'u3', refreshTokenHash: 'hx-1', expiresAt: new Date(Date.now() - 1000) });
    await createUserSession({ userId: 'u3', refreshTokenHash: 'hx-2', expiresAt: new Date(Date.now() + 100000) });
    const deleted = await deleteExpiredSessions();
    expect(typeof deleted).toBe('number');
    const stillThere = await findActiveSessionByHash('hx-2');
    expect(stillThere && stillThere.userId).toBe('u3');
  });
});
