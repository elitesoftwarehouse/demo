import request from 'supertest';
import app from '../../src/server';

// Helpers
function pad(n: number) { return n < 10 ? `0${n}` : String(n); }
function toDateKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

async function fetchAllForUser(userId: string, opts: { status?: string; order?: 'asc'|'desc'; from?: string; to?: string } = {}) {
  const q = new URLSearchParams();
  q.set('page', '1');
  q.set('pageSize', '100'); // dataset is ~60 items in stub
  if (opts.status) q.set('status', opts.status);
  if (opts.order) q.set('order', opts.order);
  if (opts.from) q.set('from', opts.from);
  if (opts.to) q.set('to', opts.to);
  const res = await request(app)
    .get('/api/bookings/me?' + q.toString())
    .set('x-user-id', userId)
    .expect(200);
  return res.body as { items: any[]; page: number; pageSize: number; totalItems: number; totalPages: number; hasNext: boolean; hasPrevious: boolean };
}

function assertAllStatus(items: any[], status: string) {
  for (const it of items) {
    expect(it.status).toBe(status);
  }
}

describe('GET /api/bookings/me — pagination and status filtering', () => {
  const userA = 'user-alpha';
  const userB = 'user-bravo';

  it('returns only bookings for the authenticated user (isolation by x-user-id)', async () => {
    const a = await fetchAllForUser(userA);
    const b = await fetchAllForUser(userB);
    expect(a.totalItems).toBeGreaterThan(0);
    expect(b.totalItems).toBeGreaterThan(0);
    // IDs are seeded by user; sets should differ
    const setA = new Set(a.items.map(x => x.id));
    const overlap = b.items.some(x => setA.has(x.id));
    expect(overlap).toBe(false);
  });

  it('paginates correctly: first, middle, last pages with metadata', async () => {
    const first = await fetchAllForUser(userA, { });
    const total = first.totalItems;
    expect(first.page).toBe(1);
    expect(first.pageSize).toBe(100);
    expect(first.totalPages).toBe(1); // with pageSize=100 and ~60 items
    expect(first.hasNext).toBe(false);
    expect(first.hasPrevious).toBe(false);

    // Now use small pageSize to force multiple pages
    const pageSize = 7;
    const res1 = await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: 1, pageSize })
      .expect(200);
    const body1 = res1.body;
    expect(body1.items.length).toBe(Math.min(pageSize, total));
    expect(body1.page).toBe(1);
    expect(body1.pageSize).toBe(pageSize);
    expect(body1.totalItems).toBe(total);
    expect(body1.totalPages).toBe(Math.max(1, Math.ceil(total / pageSize)));
    expect(body1.hasNext).toBe(total > pageSize);
    expect(body1.hasPrevious).toBe(false);

    const middlePage = Math.min(2, body1.totalPages); // page 2 if exists
    const res2 = await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: middlePage, pageSize })
      .expect(200);
    const body2 = res2.body;
    expect(body2.page).toBe(middlePage);
    if (middlePage > 1) {
      expect(body2.hasPrevious).toBe(true);
    }

    const lastPage = body1.totalPages;
    const resLast = await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: 9999, pageSize }) // out of range → server should clamp to last page
      .expect(200);
    const bodyLast = resLast.body;
    expect(bodyLast.page).toBe(lastPage);
    expect(bodyLast.hasNext).toBe(false);
    expect(bodyLast.items.length).toBe((() => {
      const rem = total % pageSize;
      return rem === 0 ? pageSize : rem;
    })());
  });

  it('handles page < 1 by clamping to page 1', async () => {
    const pageSize = 10;
    const res = await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: 0, pageSize })
      .expect(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(pageSize);
  });

  it('combines pagination with status filter ATTIVA', async () => {
    const all = await fetchAllForUser(userA, {});
    // Build expectation by filtering the server-returned status labels
    const expectedActive = all.items.filter(x => x.status === 'ATTIVA');

    const pageSize = 5;
    const res = await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: 1, pageSize, status: 'ATTIVA' })
      .expect(200);
    const body = res.body;

    expect(body.totalItems).toBe(expectedActive.length);
    expect(body.totalPages).toBe(Math.max(1, Math.ceil(expectedActive.length / pageSize)));
    assertAllStatus(body.items, 'ATTIVA');
  });

  it('applies status filters PASSATA and CANCELLATA correctly', async () => {
    const all = await fetchAllForUser(userA);
    const expectedPast = all.items.filter(x => x.status === 'PASSATA');
    const expectedCancelled = all.items.filter(x => x.status === 'CANCELLATA');

    const resPast = await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: 1, pageSize: 50, status: 'PASSATA' })
      .expect(200);
    expect(resPast.body.totalItems).toBe(expectedPast.length);
    assertAllStatus(resPast.body.items, 'PASSATA');

    const resCanc = await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: 1, pageSize: 50, status: 'CANCELLATA' })
      .expect(200);
    expect(resCanc.body.totalItems).toBe(expectedCancelled.length);
    assertAllStatus(resCanc.body.items, 'CANCELLATA');
  });

  it('edge case: no bookings in range -> empty list with sensible metadata', async () => {
    // Choose a time range far in the past to guarantee empty
    const res = await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: 1, pageSize: 10, from: '1900-01-01', to: '1900-01-05' })
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(0);
    expect(res.body.totalItems).toBe(0);
    expect(res.body.totalPages).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.hasNext).toBe(false);
    expect(res.body.hasPrevious).toBe(false);
  });

  it('edge case: pageSize very small and near maximum', async () => {
    const verySmall = await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: 1, pageSize: 1 })
      .expect(200);
    expect(verySmall.body.pageSize).toBe(1);
    expect(verySmall.body.items.length).toBe(1);

    const nearMax = await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: 1, pageSize: 100 })
      .expect(200);
    expect(nearMax.body.pageSize).toBe(100);
    // Dataset is ~60 → totalPages should be 1
    expect(nearMax.body.totalPages).toBe(1);
  });

  it('mix of statuses present in unfiltered result (ATTIVA and PASSATA at least)', async () => {
    const all = await fetchAllForUser(userA);
    const statuses = new Set(all.items.map(x => x.status));
    expect(statuses.has('ATTIVA')).toBe(true);
    expect(statuses.has('PASSATA')).toBe(true);
    // CANCELLED may or may not be present depending on RNG; do not assert strictly
  });

  it('status=ALL or NONE behaves like no filter', async () => {
    const base = await fetchAllForUser(userA);
    const allFlag = await fetchAllForUser(userA, { status: 'ALL' });
    const noneFlag = await fetchAllForUser(userA, { status: 'NONE' });
    expect(allFlag.totalItems).toBe(base.totalItems);
    expect(noneFlag.totalItems).toBe(base.totalItems);
  });

  it('validates from/to formats (400 on invalid)', async () => {
    await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ from: '2026/01/01' })
      .expect(400);
    await request(app).get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ to: '20260101' })
      .expect(400);
  });

  it('ordering asc/desc is accepted and returns consistent page counts', async () => {
    const asc = await fetchAllForUser(userA, { order: 'asc' });
    const desc = await fetchAllForUser(userA, { order: 'desc' });
    expect(asc.totalItems).toBe(desc.totalItems);
    // Ensure first item differs by order unless all items share same key
    if (asc.items.length > 1) {
      const ascFirst = asc.items[0]?.id;
      const descFirst = desc.items[0]?.id;
      expect(ascFirst).not.toBe(descFirst);
    }
  });

  it('intermediate page contents match slicing of full dataset', async () => {
    const full = await fetchAllForUser(userA, { order: 'asc' });
    const pageSize = 8;
    const page3 = await request(app)
      .get('/api/bookings/me')
      .set('x-user-id', userA)
      .query({ page: 3, pageSize, order: 'asc' })
      .expect(200);
    const expectedSlice = full.items.slice((3 - 1) * pageSize, (3 - 1) * pageSize + pageSize).map(x => x.id);
    const gotSlice = page3.body.items.map((x: any) => x.id);
    expect(gotSlice).toEqual(expectedSlice);
  });
});
