/*
  Integration/E2E-style tests for bookings API behavior and client-side constraints.
  We mock the DB layer (pg client) with an in-memory store to validate controller + repository + state service.
*/

// declare jest for TS without types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

// Simple response stub used in other tests
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

// Build a DB mock compatible with src/db/client.ts query() contract and also mock calendar service
function setupDbMock() {
  type BookingRow = {
    id: string;
    user_id: string;
    desk_id: string;
    date: string; // YYYY-MM-DD
    status: string;
    state?: string | null;
    created_at: string;
    updated_at: string;
  };

  const dbState = {
    bookings: [] as BookingRow[],
    idCounter: 1,
  };

  function nowIso(): string { return new Date().toISOString(); }
  function makeId(): string { return `b-${dbState.idCounter++}`; }

  jest.resetModules();

  // Mock calendar service to avoid closed days blocking tests
  jest.doMock('../../../modules/calendar/holiday.service', () => ({
    computeDisabledDates: (_start: Date, _end: Date) => [],
    parseIsoDate: (s: string) => new Date(s),
  }));

  // Mock DB client
  jest.doMock('../../../db/client', () => ({
    getDbPool() { return null; },
    async query(text: string, params?: any[]) {
      const sql = String(text || '').trim().toLowerCase();

      // INSERT booking
      if (sql.startsWith('insert into bookings')) {
        const [user_id, desk_id, dateStr, status] = params as [string, string, string, string];
        const row: BookingRow = {
          id: makeId(),
          user_id,
          desk_id,
          date: dateStr,
          status: status || 'confirmed',
          state: null, // not explicitly set, computed by service
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        dbState.bookings.push(row);
        return { rows: [row] };
      }

      // SELECT by desk/date for conflicts
      if (sql.startsWith('select * from bookings where desk_id =')) {
        const [desk_id, dateStr] = params as [string, string];
        const found = dbState.bookings.find((b) => b.desk_id === desk_id && b.date === dateStr);
        return { rows: found ? [found] : [] };
      }

      // SELECT count by user/date
      if (sql.startsWith('select count(1) as c from bookings where user_id =') && sql.includes('and date =')) {
        const [user_id, dateStr] = params as [string, string];
        const c = dbState.bookings.filter((b) => b.user_id === user_id && b.date === dateStr).length;
        return { rows: [{ c: String(c) }] } as any;
      }

      // SELECT by id
      if (sql.startsWith('select * from bookings where id =')) {
        const [id] = params as [string];
        const found = dbState.bookings.find((b) => b.id === id);
        return { rows: found ? [found] : [] };
      }

      // UPDATE cancellation with date >= today constraint
      if (sql.startsWith('update bookings') && sql.includes('set state') && sql.includes('where id = $1')) {
        const [id, user_id, newState, today] = params as [string, string, string, string];
        const row = dbState.bookings.find((b) => b.id === id && b.user_id === user_id);
        if (!row) return { rows: [] };
        if (row.date < String(today)) return { rows: [] }; // emulate WHERE date >= $4
        row.state = newState;
        row.updated_at = nowIso();
        return { rows: [row] };
      }

      // Complex list query built with CTE future/past union
      if (sql.startsWith('with future as (')) {
        const [user_id, today, offset, limit] = params as [string, string, number, number];
        const all = dbState.bookings.filter((b) => b.user_id === user_id);
        const future = all.filter((b) => b.date >= String(today)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        const past = all.filter((b) => b.date < String(today)).sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
        const ordered = [...future.map((r) => ({ ...r, bucket: 0 })), ...past.map((r) => ({ ...r, bucket: 1 }))];
        const pageItems = ordered.slice(offset, offset + limit);
        return { rows: pageItems } as any;
      }

      // COUNT for list
      if (sql.startsWith('select count(1) as c from bookings where user_id = $1') && !sql.includes('and date =')) {
        const [user_id] = params as [string];
        const c = dbState.bookings.filter((b) => b.user_id === user_id).length;
        return { rows: [{ c: String(c) }] } as any;
      }

      // Default fallback
      throw new Error(`Unhandled SQL in mock: ${sql}`);
    },
  }));

  // After mocks are set, require controller to pick them up
  const controllers = require('../bookings.controller');

  return { dbState, controllers };
}

function makeReq(authUserId: string, extra?: any): any {
  return { user: { id: authUserId, email: `${authUserId}@example.com`, roles: ['user'] }, ...(extra || {}) } as any;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toIsoDate(d: Date): string { return d.toISOString().slice(0, 10); }

describe('Bookings API integration', () => {
  test('create future booking -> state ATTIVA, ignoring client-provided state', async () => {
    const { dbState, controllers } = setupDbMock();
    const { createBookingHandler } = controllers;
    const userId = 'u1';
    const futureIso = toIsoDate(addDays(new Date(), 5));

    const req = makeReq(userId, { body: { deskId: 'D-1', date: futureIso, state: 'CANCELLATA' } });
    const res = makeRes();

    await createBookingHandler(req, res);

    expect(res.data.statusCode).toBe(201);
    expect(res.data.body && res.data.body.state).toBe('ATTIVA');
    // Verify DB stored row exists with same date/desk
    const row = dbState.bookings.find((b) => b.desk_id === 'D-1' && b.date === futureIso);
    expect(row).toBeTruthy();
    // Ensure client state was not persisted explicitly (state remains null -> computed)
    expect(row && row.state).toBeNull();
  });

  test('create past booking -> state PASSATA', async () => {
    const { controllers } = setupDbMock();
    const { createBookingHandler } = controllers;
    const userId = 'u2';
    const pastIso = toIsoDate(addDays(new Date(), -3));

    const req = makeReq(userId, { body: { deskId: 'D-2', date: pastIso, state: 'ATTIVA' } });
    const res = makeRes();

    await createBookingHandler(req, res);

    expect(res.data.statusCode).toBe(201);
    expect(res.data.body && res.data.body.state).toBe('PASSATA');
  });

  test('cancel a future booking -> state CANCELLATA and remains canceled in listing', async () => {
    const { dbState, controllers } = setupDbMock();
    const { createBookingHandler, deleteBookingHandler, listMyBookingsHandler } = controllers;
    const userId = 'u3';
    const futureIso = toIsoDate(addDays(new Date(), 2));

    // Create booking first
    const resCreate = makeRes();
    await createBookingHandler(makeReq(userId, { body: { deskId: 'D-3', date: futureIso } }), resCreate);
    expect(resCreate.data.statusCode).toBe(201);
    const bookingId = String(resCreate.data.body && resCreate.data.body.bookingId);

    // Cancel booking
    const resCancel = makeRes();
    await deleteBookingHandler(makeReq(userId, { params: { id: bookingId } }), resCancel);
    expect(resCancel.data.statusCode).toBe(200);
    expect(resCancel.data.body && resCancel.data.body.state).toBe('CANCELLATA');

    // List bookings and check state
    const resList = makeRes();
    await listMyBookingsHandler(makeReq(userId, { query: { page: 1, size: 10 } }), resList);
    expect(resList.data.statusCode).toBe(200);
    const item = (resList.data.body && resList.data.body.items || []).find((x: any) => x.id === bookingId);
    expect(item && item.state).toBe('CANCELLATA');

    // Client cannot resurrect by sending a payload with state; creation ignores state
    const resCreate2 = makeRes();
    await createBookingHandler(makeReq(userId, { body: { deskId: 'D-4', date: futureIso, state: 'ATTIVA' } }), resCreate2);
    expect(resCreate2.data.statusCode).toBe(201);
    expect(resCreate2.data.body && resCreate2.data.body.state).toBe('ATTIVA');

    // Ensure original canceled booking stayed canceled in DB
    const stored = dbState.bookings.find((b) => b.id === bookingId);
    expect(stored && stored.state).toBe('CANCELLATA');
  });

  test('cannot cancel a past booking -> 409 error per business rule', async () => {
    const { controllers } = setupDbMock();
    const { createBookingHandler, deleteBookingHandler, listMyBookingsHandler } = controllers;
    const userId = 'u4';
    const pastIso = toIsoDate(addDays(new Date(), -1));

    // Create a past booking
    const resCreate = makeRes();
    await createBookingHandler(makeReq(userId, { body: { deskId: 'D-5', date: pastIso } }), resCreate);
    expect(resCreate.data.statusCode).toBe(201);
    const bookingId = String(resCreate.data.body && resCreate.data.body.bookingId);

    // Attempt cancellation -> should fail with 409
    const resCancel = makeRes();
    await deleteBookingHandler(makeReq(userId, { params: { id: bookingId } }), resCancel);
    expect(resCancel.data.statusCode).toBe(409);
    expect(resCancel.data.body && resCancel.data.body.code).toBe('BOOKING_ALREADY_PAST');

    // Verify listing returns PASSATA
    const resList = makeRes();
    await listMyBookingsHandler(makeReq(userId, { query: { page: 1, size: 10 } }), resList);
    const it = (resList.data.body && resList.data.body.items || []).find((x: any) => x.id === bookingId);
    expect(it && it.state).toBe('PASSATA');
  });

  test('API ignores any client-provided "state" field in input payloads', async () => {
    const { controllers } = setupDbMock();
    const { createBookingHandler, bookDeskHandler } = controllers;
    const userId = 'u5';
    const futureIso = toIsoDate(addDays(new Date(), 1));

    const res1 = makeRes();
    await createBookingHandler(makeReq(userId, { body: { deskId: 'D-6', date: futureIso, state: 'CANCELLATA' } }), res1);
    expect(res1.data.statusCode).toBe(201);
    expect(res1.data.body && res1.data.body.state).toBe('ATTIVA');

    // Same with bookDeskHandler variant
    const res2 = makeRes();
    await bookDeskHandler(makeReq(userId, { params: { deskId: 'D-7' }, body: { date: futureIso, state: 'PASSATA' } }), res2);
    expect(res2.data.statusCode).toBe(201);
    expect(res2.data.body && res2.data.body.state).toBe('ATTIVA');
  });
});
