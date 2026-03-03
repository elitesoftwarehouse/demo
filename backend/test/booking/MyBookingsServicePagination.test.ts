// Unit-level tests focused on pagination and status filter computations
// We exercise the REST layer with controlled parameters but validate the math and filters.

import request from 'supertest';
import app from '../../src/server';

describe('MyBookings pagination math and status filters', () => {
  const user = 'user-service-math';

  function qs(params: Record<string, any>) {
    return new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  }

  it('returns correct totalItems/totalPages for various pageSize values', async () => {
    const base = await request(app).get('/api/bookings/me?' + qs({ page: 1, pageSize: 100 }))
      .set('x-user-id', user)
      .expect(200);
    const total = base.body.totalItems as number;
    expect(total).toBeGreaterThan(0);

    for (const pageSize of [1, 2, 5, 10, 20, 50, 100]) {
      const res = await request(app).get('/api/bookings/me?' + qs({ page: 1, pageSize }))
        .set('x-user-id', user)
        .expect(200);
      const expectedPages = Math.max(1, Math.ceil(total / pageSize));
      expect(res.body.totalPages).toBe(expectedPages);
      // First page item count
      expect(res.body.items.length).toBe(Math.min(pageSize, total));
    }
  });

  it('supports last page size remainder correctly', async () => {
    // Use a pageSize that does not divide total evenly
    const base = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ page: 1, pageSize: 7 })
      .expect(200);
    const total = base.body.totalItems as number;
    const totalPages = base.body.totalPages as number;

    const last = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ page: totalPages, pageSize: 7 })
      .expect(200);

    const rem = total % 7;
    expect(last.body.items.length).toBe(rem === 0 ? 7 : rem);
  });

  it('applies state filter ATTIVA|PASSATA|CANCELLATA with dataset examples', async () => {
    const base = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ page: 1, pageSize: 100 })
      .expect(200);
    const items = base.body.items as Array<{ status: string }>;
    const counts = items.reduce((acc, it) => { acc[it.status] = (acc[it.status] || 0) + 1; return acc; }, {} as Record<string, number>);

    for (const st of ['ATTIVA', 'PASSATA', 'CANCELLATA']) {
      const res = await request(app).get('/api/bookings/me')
        .set('x-user-id', user)
        .query({ page: 1, pageSize: 100, status: st })
        .expect(200);
      expect(res.body.totalItems).toBe(counts[st] || 0);
      for (const it of res.body.items) expect(it.status).toBe(st);
    }
  });

  it('page out of range clamps to last page and maintains page metadata', async () => {
    const base = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ page: 1, pageSize: 9 })
      .expect(200);
    const totalPages = base.body.totalPages as number;

    const far = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ page: 999, pageSize: 9 })
      .expect(200);
    expect(far.body.page).toBe(totalPages);
    expect(far.body.hasNext).toBe(false);
    expect(far.body.hasPrevious).toBe(totalPages > 1);
  });
});
