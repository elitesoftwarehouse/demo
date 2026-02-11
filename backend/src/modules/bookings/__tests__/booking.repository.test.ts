import { listUserBookings } from '../booking.repository';
import * as db from '../../../db/client';

type DbRow = {
  id: string;
  user_id: string;
  desk_id: string;
  date: string; // YYYY-MM-DD
  status: string;
  created_at: string;
  updated_at: string;
};

describe('listUserBookings (repository)', () => {
  const spy = jest.spyOn(db, 'query');

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setupQueryMock(seed: DbRow[]) {
    spy.mockImplementation(async (sql: string, params?: any[]) => {
      // Count query
      if (/COUNT\(1\) AS c/i.test(sql)) {
        const userId = params?.[0];
        const total = seed.filter((r) => r.user_id === userId).length;
        return { rows: [{ c: String(total) }] } as any;
      }

      // List query (UNION future/past)
      if (/WITH\s+future\s+AS/i.test(sql)) {
        const userId = params?.[0];
        const todayIso: string = params?.[1];
        const offset: number = params?.[2] ?? 0;
        const limit: number = params?.[3] ?? 20;

        const userRows = seed.filter((r) => r.user_id === userId);
        const future = userRows.filter((r) => r.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date));
        const past = userRows.filter((r) => r.date < todayIso).sort((a, b) => b.date.localeCompare(a.date));
        const ordered = [...future, ...past];
        const paged = ordered.slice(offset, offset + limit);

        // Add bucket to align with repository generic typing
        const rows = paged.map((r) => ({ ...r, bucket: r.date >= todayIso ? 0 : 1 }));
        return { rows } as any;
      }

      throw new Error('Unexpected SQL in test mock');
    });
  }

  it('returns empty result when user has no bookings', async () => {
    const seed: DbRow[] = [];
    setupQueryMock(seed);

    const res = await listUserBookings('u1', { nowIsoDate: '2025-01-10' });
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
    expect(res.page).toBe(1);
    expect(res.size).toBe(20);
  });

  it('filters by user and orders future ASC then past DESC', async () => {
    const seed: DbRow[] = [
      // other user
      { id: 'x1', user_id: 'u2', desk_id: 'd9', date: '2025-01-01', status: 'confirmed', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      // target user - past
      { id: 'a1', user_id: 'u1', desk_id: 'd1', date: '2025-01-01', status: 'confirmed', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'a2', user_id: 'u1', desk_id: 'd2', date: '2025-01-05', status: 'pending', created_at: '2025-01-05T00:00:00Z', updated_at: '2025-01-05T00:00:00Z' },
      // target user - future (today and beyond)
      { id: 'a3', user_id: 'u1', desk_id: 'd3', date: '2025-01-10', status: 'confirmed', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
      { id: 'a4', user_id: 'u1', desk_id: 'd4', date: '2025-01-12', status: 'confirmed', created_at: '2025-01-12T00:00:00Z', updated_at: '2025-01-12T00:00:00Z' },
      // same date tie
      { id: 'a5', user_id: 'u1', desk_id: 'd5', date: '2025-01-12', status: 'pending', created_at: '2025-01-12T00:00:00Z', updated_at: '2025-01-12T00:00:00Z' },
    ];
    setupQueryMock(seed);

    const res = await listUserBookings('u1', { nowIsoDate: '2025-01-10' });

    // Expect only u1
    expect(res.total).toBe(5);
    expect(res.items.every((i) => ['d1', 'd2', 'd3', 'd4', 'd5'].includes(i.deskId))).toBe(true);

    // Order: future asc (10, 12, 12) then past desc (05, 01)
    const dates = res.items.map((i) => i.startDate);
    expect(dates.slice(0, 1)).toEqual(['2025-01-10']);
    expect(new Set(dates.slice(1, 3))).toEqual(new Set(['2025-01-12', '2025-01-12']));
    expect(dates.slice(3)).toEqual(['2025-01-05', '2025-01-01']);

    // Data format checks
    const first = res.items[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('startDate');
    expect(first).toHaveProperty('endDate');
    expect(first.endDate).toBeNull();
    expect(first).toHaveProperty('deskId');
    expect(first).toHaveProperty('status');
  });

  it('supports pagination', async () => {
    const seed: DbRow[] = [
      { id: 'b1', user_id: 'u1', desk_id: 'd1', date: '2025-01-10', status: 'confirmed', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
      { id: 'b2', user_id: 'u1', desk_id: 'd2', date: '2025-01-11', status: 'confirmed', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
      { id: 'b3', user_id: 'u1', desk_id: 'd3', date: '2025-01-12', status: 'confirmed', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
      { id: 'b4', user_id: 'u1', desk_id: 'd4', date: '2025-01-13', status: 'confirmed', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z' },
    ];
    setupQueryMock(seed);

    const page1 = await listUserBookings('u1', { page: 1, size: 2, nowIsoDate: '2025-01-10' });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(4);
    expect(page1.items.map((i) => i.deskId)).toEqual(['d1', 'd2']);

    const page2 = await listUserBookings('u1', { page: 2, size: 2, nowIsoDate: '2025-01-10' });
    expect(page2.items).toHaveLength(2);
    expect(page2.total).toBe(4);
    expect(page2.items.map((i) => i.deskId)).toEqual(['d3', 'd4']);
  });
});
