import { cancelBookingForUserWithAudit, getBookingCancellationAudit } from '../booking.repository';

// declare jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

function setupDbMock() {
  type BookingRow = {
    id: string; user_id: string; desk_id: string; date: string; status: string; state?: string;
    created_at: string; updated_at: string; canceled_at?: string | null; canceled_by?: string | null; cancel_reason?: string | null;
  };

  const dbState = {
    bookings: [] as BookingRow[],
  };

  function nowIso() { return new Date().toISOString(); }

  const dbModuleFactory = () => ({
    async query(text: string, params?: any[]) {
      const sql = String(text).trim().toLowerCase();

      if (sql.startsWith('update bookings')) {
        const [id, userId, state, reason, today] = [params![0], params![1], params![2], params![3], params![4]];
        const row = dbState.bookings.find((b) => b.id === id && b.user_id === userId && b.date >= today);
        if (!row) return { rows: [] } as any;
        row.state = state;
        row.canceled_at = nowIso();
        row.canceled_by = userId;
        row.cancel_reason = reason;
        row.updated_at = nowIso();
        return { rows: [row] } as any;
      }

      if (sql.startsWith('select canceled_at')) {
        const id = params![0];
        const row = dbState.bookings.find((b) => b.id === id);
        if (!row) return { rows: [] } as any;
        const { canceled_at, canceled_by, cancel_reason } = row;
        return { rows: [{ canceled_at, canceled_by, cancel_reason }] } as any;
      }

      throw new Error('unhandled sql: ' + text);
    },
  });

  jest.doMock('../../../db/client', dbModuleFactory);
  jest.resetModules();

  const repo = require('../booking.repository');
  return { dbState, repo };
}

describe('booking.repository - cancel with audit', () => {
  test('successful cancel updates state and audit fields', async () => {
    const { dbState } = setupDbMock();
    const bookingId = 'b100';
    dbState.bookings.push({ id: bookingId, user_id: 'u1', desk_id: 'd1', date: '2026-01-10', status: 'confirmed', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' });

    const { cancelBookingForUserWithAudit: cancelFn, getBookingCancellationAudit: getAudit } = require('../booking.repository');

    const updated = await cancelFn(bookingId, 'u1', { reason: 'USER_REQUEST', todayIso: '2026-01-05' });
    expect(updated).toBeTruthy();

    const audit = await getAudit(bookingId);
    expect(audit && audit.canceledAt).toBeInstanceOf(Date);
    expect(audit && audit.canceledBy).toBe('u1');
    expect(audit && audit.cancelReason).toBe('USER_REQUEST');
  });

  test('cancel fails (returns null) when booking is older than todayIso or not owned', async () => {
    const { dbState } = setupDbMock();
    const bookingId = 'b101';
    dbState.bookings.push({ id: bookingId, user_id: 'u1', desk_id: 'd1', date: '2026-01-01', status: 'confirmed', created_at: '2025-12-01T00:00:00.000Z', updated_at: '2025-12-01T00:00:00.000Z' });

    const { cancelBookingForUserWithAudit: cancelFn } = require('../booking.repository');

    const resPast = await cancelFn(bookingId, 'u1', { reason: 'USER_REQUEST', todayIso: '2026-01-05' });
    expect(resPast).toBeNull();

    const resNotOwner = await cancelFn(bookingId, 'u2', { reason: 'USER_REQUEST', todayIso: '2025-12-30' });
    expect(resNotOwner).toBeNull();
  });
});
