import * as express from 'express';
const request = require('supertest');
import { JwtService } from '../../../../src/core/security/JwtService';
import { registerBookingRoutes } from '../../../../src/modules/bookings/http/routes';
import { InMemoryBookingRepository } from '../../../../src/modules/bookings/repository/BookingRepository';
import { Booking } from '../../../../src/modules/bookings/domain/entities/Booking';

function makeBooking(id: string, userId: string, startOffsetDays: number, durationHours: number, state: any): Booking {
  const now = new Date();
  const startAt = new Date(now.getTime() + startOffsetDays * 24 * 3600 * 1000);
  const endAt = new Date(startAt.getTime() + durationHours * 3600 * 1000);
  return new Booking({ id, userId, startAt, endAt, state, createdAt: now, updatedAt: now });
}

describe('My Bookings API - pagination and filters', () => {
  const jwt = new JwtService({ issuer: 'i', audience: 'a', accessSecret: 'S', accessTtl: '10m' });
  const repo = new InMemoryBookingRepository();

  const app = express();
  app.use(express.json());
  const router = express.Router();
  // Register routes with our jwt instance
  registerBookingRoutes(router, repo, { jwt });
  app.use('/', router);

  // Helper to auth a request
  function auth(tokenUserId: string) {
    const { token } = jwt.signAccessToken(tokenUserId, tokenUserId + '@example.com');
    return { Authorization: `Bearer ${token}` } as any;
  }

  beforeAll(async () => {
    const items: Booking[] = [];
    // u1: 23 bookings, mix states
    for (let i = 1; i <= 10; i++) items.push(makeBooking('u1-a-' + i, 'u1', i, 1, 'ATTIVA'));
    for (let i = 1; i <= 8; i++) items.push(makeBooking('u1-p-' + i, 'u1', -i, 1, 'PASSATA'));
    for (let i = 1; i <= 5; i++) items.push(makeBooking('u1-c-' + i, 'u1', -20 - i, 1, 'CANCELLATA'));
    // u2: some bookings
    for (let i = 1; i <= 7; i++) items.push(makeBooking('u2-a-' + i, 'u2', i, 1, 'ATTIVA'));
    await repo.seed(items);
  });

  it('returns first, middle and last page correctly', async () => {
    const res1 = await request(app).get('/api/bookings/my?page=1&pageSize=10').set(auth('u1'));
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.page).toBe(1);
    expect(res1.body.data.totalItems).toBe(23);
    expect(res1.body.data.totalPages).toBe(3);
    expect(res1.body.data.items.length).toBe(10);

    const res2 = await request(app).get('/api/bookings/my?page=2&pageSize=10').set(auth('u1'));
    expect(res2.body.data.page).toBe(2);
    expect(res2.body.data.items.length).toBe(10);

    const res3 = await request(app).get('/api/bookings/my?page=3&pageSize=10').set(auth('u1'));
    expect(res3.body.data.page).toBe(3);
    expect(res3.body.data.items.length).toBe(3);
  });

  it('handles page out of range (<1 and too large)', async () => {
    const r1 = await request(app).get('/api/bookings/my?page=0&pageSize=5').set(auth('u1'));
    expect(r1.body.data.page).toBe(1);

    const r2 = await request(app).get('/api/bookings/my?page=99&pageSize=5').set(auth('u1'));
    expect(r2.body.data.totalPages).toBe(5);
    expect(r2.body.data.items.length).toBe(0);
  });

  it('combines pagination + state filter and restricts to authenticated user', async () => {
    const r1 = await request(app).get('/api/bookings/my?page=1&pageSize=5&state=ATTIVA').set(auth('u1'));
    expect(r1.status).toBe(200);
    expect(r1.body.data.totalItems).toBe(10);
    expect(r1.body.data.items.every((b: any) => b.state === 'ATTIVA')).toBe(true);

    const r2 = await request(app).get('/api/bookings/my?page=1&pageSize=50&state=ATTIVA').set(auth('u2'));
    expect(r2.body.data.totalItems).toBe(7);
    expect(r2.body.data.items.length).toBe(7);
    expect(r2.body.data.items.every((b: any) => b.userId === 'u2')).toBe(true);
  });

  it('edge cases: no bookings, all same state, small/near-max pageSize', async () => {
    // New repo with no data
    const repo2 = new InMemoryBookingRepository();
    const app2 = express();
    const router2 = express.Router();
    registerBookingRoutes(router2, repo2, { jwt });
    app2.use('/', router2);

    const e = await request(app2).get('/api/bookings/my?page=1&pageSize=10').set(auth('u3'));
    expect(e.body.data.totalItems).toBe(0);
    expect(e.body.data.totalPages).toBe(0);

    const items: Booking[] = [];
    for (let i = 1; i <= 9; i++) items.push(makeBooking('u4-p-' + i, 'u4', -i, 1, 'PASSATA'));
    await repo2.seed(items);

    const allPast = await request(app2).get('/api/bookings/my?page=1&pageSize=3&state=PASSATA').set(auth('u4'));
    expect(allPast.body.data.totalItems).toBe(9);
    expect(allPast.body.data.items.length).toBe(3);

    const tiny = await request(app2).get('/api/bookings/my?page=1&pageSize=1').set(auth('u4'));
    expect(tiny.body.data.items.length).toBe(1);

    const nearMax = await request(app2).get('/api/bookings/my?page=1&pageSize=100').set(auth('u4'));
    expect(nearMax.body.data.items.length).toBe(9);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/bookings/my?page=1&pageSize=10');
    expect(res.status).toBe(401);
  });
});
