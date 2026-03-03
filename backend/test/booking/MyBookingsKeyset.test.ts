import request from 'supertest';
import app from '../../src/server';

function collectIds(items: any[]) { return items.map(x => x.id); }

describe('GET /api/bookings/me — keyset pagination (limit/cursor)', () => {
  const user = 'user-keyset';

  it('paginates forward with cursor and preserves order without overlap', async () => {
    const limit = 5;
    const first = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ limit, order: 'asc' })
      .expect(200);
    expect(first.body.items.length).toBe(limit);
    expect(first.body.hasNext).toBe(true);
    const cursor = first.body.nextCursor as string;
    expect(typeof cursor).toBe('string');

    const second = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ limit, cursor, order: 'asc' })
      .expect(200);

    const ids1 = collectIds(first.body.items);
    const ids2 = collectIds(second.body.items);
    // Ensure no overlap between pages
    const overlap = ids2.some(id => ids1.includes(id));
    expect(overlap).toBe(false);

    // Validate against full dataset slice
    const full = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ page: 1, pageSize: 2 * limit, order: 'asc' })
      .expect(200);
    const expected = collectIds(full.body.items);
    expect([...ids1, ...ids2]).toEqual(expected);
  });

  it('combines cursor pagination with status filter', async () => {
    const limit = 4;
    // First page of ATTIVA only
    const first = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ limit, status: 'ATTIVA', order: 'asc' })
      .expect(200);
    for (const it of first.body.items) expect(it.status).toBe('ATTIVA');
    const cursor = first.body.nextCursor as string;

    const second = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ limit, cursor, status: 'ATTIVA', order: 'asc' })
      .expect(200);
    for (const it of second.body.items) expect(it.status).toBe('ATTIVA');

    // Verify combined length equals first two pages using offset mode with same filter/order
    const full = await request(app).get('/api/bookings/me')
      .set('x-user-id', user)
      .query({ page: 1, pageSize: 2 * limit, status: 'ATTIVA', order: 'asc' })
      .expect(200);
    const got = [...first.body.items, ...second.body.items].map((x: any) => x.id);
    const expected = (full.body.items as any[]).map(x => x.id);
    expect(got).toEqual(expected);
  });
});
