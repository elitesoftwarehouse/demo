/* Integration-style tests for cancelBookingHandler with mocked DB and auth context */

// declare jest for TS without types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

function makeRes() {
  const store: any = { statusCode: 200, body: undefined };
  return {
    status(code: number) { store.statusCode = code; return this; },
    json(payload: any) { store.body = payload; },
    get data() { return store; },
  } as any;
}

function setupDbMock() {
  type BookingRow = {
    id: string; user_id: string; desk_id: string; date: string; status: string; state?: string;
    created_at: string; updated_at: string;
  };

  const dbState = {
    bookings: [] as BookingRow[],
  };

  function nowIso() { return new Date().toISOString(); }

  // Mock query implementation used by findBookingById and the UPDATE in controller
  const dbModuleFactory = () => ({
    async query(text: string, params?: any[]) {
      const sql = String(text).trim().toLowerCase();
      if (sql.startsWith('select * from bookings where id =')) {
        const id = params![0];
        const row = dbState.bookings.find((b) => b.id === id) || null;
        return { rows: row ? [row] : [] } as any;
      }
      if (sql.startsWith('update bookings')) {
        const [id, , userId] = params as any[]; // [bookingId, 'CANCELLATA', userId]
        const row = dbState.bookings.find((b) => b.id === id && b.user_id === userId);
        if (!row) return { rows: [] } as any;
        row.state = 'CANCELLATA';
        row.updated_at = nowIso();
        return { rows: [row] } as any;
      }
      throw new Error('unhandled sql: ' + text);
    },
  });

  jest.doMock('../../../db/client', dbModuleFactory);

  // findBookingById lives in repository and uses query; remock module to use our mocked db
  jest.resetModules();
  const repo = require('../../../modules/bookings/booking.repository');
  return { dbState, repo };
}

describe('cancelBookingHandler - integration happy/negative paths', () => {
  beforeAll(() => {
    process.env.BOOKING_CANCEL_CUTOFF_HOURS = '24';
    process.env.BOOKING_START_HOUR_UTC = '9';
    process.env.BOOKING_START_MINUTE_UTC = '0';
  });

  test('403 when exactly 24h before start (boundary)', async () => {
    const { dbState } = setupDbMock();
    // Booking on 2026-01-10, start 09:00Z -> now = 2026-01-09 09:00Z
    const bookingId = 'b1';
    dbState.bookings.push({ id: bookingId, user_id: 'u1', desk_id: 'd1', date: '2026-01-10', status: 'confirmed', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' });

    // Mock decision to deny at boundary
    jest.doMock('../../../modules/bookings/booking.cancellation.service', () => ({
      decideCancellation: jest.fn(() => ({ allowed: false, reason: 'CUTOFF_24H_NOT_MET', hoursBeforeStart: 24, startAt: new Date('2026-01-10T09:00:00.000Z'), now: new Date('2026-01-09T09:00:00.000Z') })),
      getCancellationPolicyFromEnv: jest.fn(() => ({ defaultStartHourUtc: 9, defaultStartMinuteUtc: 0, cutoffHours: 24 })),
    }));

    jest.resetModules();
    const { cancelBookingHandler: handler } = require('../cancel.controller');

    const res = makeRes();
    await handler({ params: { id: bookingId }, user: { id: 'u1', email: 'u@ex.com', roles: [] } } as any, res);
    expect(res.data.statusCode).toBe(403);
  });

  test('403 when less than 24h remain (23h59m)', async () => {
    const { dbState } = setupDbMock();
    const bookingId = 'b1b';
    dbState.bookings.push({ id: bookingId, user_id: 'u1', desk_id: 'd1', date: '2026-01-10', status: 'confirmed', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' });

    jest.doMock('../../../modules/bookings/booking.cancellation.service', () => ({
      decideCancellation: jest.fn(() => ({ allowed: false, reason: 'CUTOFF_24H_NOT_MET', hoursBeforeStart: 23.983, startAt: new Date('2026-01-10T09:00:00.000Z'), now: new Date('2026-01-09T09:01:00.000Z') })),
      getCancellationPolicyFromEnv: jest.fn(() => ({ defaultStartHourUtc: 9, defaultStartMinuteUtc: 0, cutoffHours: 24 })),
    }));

    jest.resetModules();
    const { cancelBookingHandler: handler } = require('../cancel.controller');

    const res = makeRes();
    await handler({ params: { id: bookingId }, user: { id: 'u1', email: 'u@ex.com', roles: [] } } as any, res);
    expect(res.data.statusCode).toBe(403);
  });

  test('200 and state updated when more than 24h remain', async () => {
    const { dbState } = setupDbMock();
    const bookingId = 'b2';
    dbState.bookings.push({ id: bookingId, user_id: 'u1', desk_id: 'd1', date: '2026-01-10', status: 'confirmed', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' });

    jest.doMock('../../../modules/bookings/booking.cancellation.service', () => ({
      decideCancellation: jest.fn(() => ({ allowed: true, reason: undefined, hoursBeforeStart: 25, startAt: new Date('2026-01-10T09:00:00.000Z'), now: new Date('2026-01-09T08:00:00.000Z') })),
      getCancellationPolicyFromEnv: jest.fn(() => ({ defaultStartHourUtc: 9, defaultStartMinuteUtc: 0, cutoffHours: 24 })),
    }));

    jest.resetModules();
    const { cancelBookingHandler: handler } = require('../cancel.controller');

    const res = makeRes();
    await handler({ params: { id: bookingId }, user: { id: 'u1', email: 'u@ex.com', roles: [] } } as any, res);
    expect(res.data.statusCode).toBe(200);

    // Verify the mocked DB state changed
    const row = dbState.bookings.find((b) => b.id === bookingId)!;
    expect(row.state).toBe('CANCELLATA');
  });

  test('404 when booking not owned by user', async () => {
    const { dbState } = setupDbMock();
    const bookingId = 'b3';
    dbState.bookings.push({ id: bookingId, user_id: 'owner', desk_id: 'd1', date: '2026-01-10', status: 'confirmed', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' });

    jest.doMock('../../../modules/bookings/booking.cancellation.service', () => ({
      decideCancellation: jest.fn(() => ({ allowed: true, startAt: new Date(), now: new Date() })),
      getCancellationPolicyFromEnv: jest.fn(() => ({ defaultStartHourUtc: 9, defaultStartMinuteUtc: 0, cutoffHours: 24 })),
    }));

    jest.resetModules();
    const { cancelBookingHandler: handler } = require('../cancel.controller');

    const res = makeRes();
    await handler({ params: { id: bookingId }, user: { id: 'intruder', email: 'i@ex.com', roles: [] } } as any, res);
    expect(res.data.statusCode).toBe(404);
  });

  test('403 when booking already cancelled or not cancellable', async () => {
    const { dbState } = setupDbMock();
    const bookingId = 'b4';
    dbState.bookings.push({ id: bookingId, user_id: 'u1', desk_id: 'd1', date: '2026-01-10', status: 'confirmed', state: 'CANCELLATA', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' });

    jest.doMock('../../../modules/bookings/booking.cancellation.service', () => ({
      decideCancellation: jest.fn(() => ({ allowed: false, reason: 'ALREADY_CANCELLED', hoursBeforeStart: 1000, startAt: new Date('2026-01-10T09:00:00.000Z'), now: new Date('2026-01-01T09:00:00.000Z') })),
      getCancellationPolicyFromEnv: jest.fn(() => ({ defaultStartHourUtc: 9, defaultStartMinuteUtc: 0, cutoffHours: 24 })),
    }));

    jest.resetModules();
    const { cancelBookingHandler: handler } = require('../cancel.controller');

    const res = makeRes();
    await handler({ params: { id: bookingId }, user: { id: 'u1', email: 'u@ex.com', roles: [] } } as any, res);
    expect(res.data.statusCode).toBe(403);
  });
});
