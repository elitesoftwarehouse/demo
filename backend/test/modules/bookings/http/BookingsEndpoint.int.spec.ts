import * as express from 'express';
const request = require('supertest');
import { registerBookingsRoutes } from '../../../../src/modules/bookings/http/routes';
import { InMemoryBookingsRepository, type Booking } from '../../../../src/modules/bookings/repository/BookingsRepository';

describe('GET /api/bookings/my endpoint', () => {
  const uidA = 'user-A';
  const uidB = 'user-B';

  const seed: Booking[] = [
    { id: 'a1', userId: uidA, deskId: 'D1', date: '2025-06-15', timeSlot: '09:00', status: 'CONFIRMED' },
    { id: 'a2', userId: uidA, deskId: 'D2', date: '2024-12-31', status: 'CANCELLED' },
    { id: 'b1', userId: uidB, deskId: 'D9', date: '2025-01-10', status: 'PENDING' },
  ];

  it('requires authentication', async () => {
    const app = express();
    const repo = new InMemoryBookingsRepository(seed);
    app.use(express.json());
    app.use('/', registerBookingsRoutes(express.Router(), repo));

    const res = await request(app).get('/api/bookings/my');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns only current user bookings in expected shape and ordered', async () => {
    const app = express();
    const repo = new InMemoryBookingsRepository(seed);
    app.use(express.json());
    app.use('/', registerBookingsRoutes(express.Router(), repo));

    const res = await request(app)
      .get('/api/bookings/my?page=1&pageSize=10')
      .set('x-user-id', uidA);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page', 1);
    expect(data).toHaveProperty('pageSize', 10);
    expect(Array.isArray(data.items)).toBe(true);

    // Only user A items
    expect(data.items.every((it: Booking) => it.userId === uidA)).toBe(true);

    // Basic booking shape
    const b = data.items[0];
    expect(b).toHaveProperty('id');
    expect(b).toHaveProperty('userId');
    expect(b).toHaveProperty('deskId');
    expect(b).toHaveProperty('date');
    expect(typeof b.date).toBe('string');
    expect(b).toHaveProperty('status');
  });

  it('supports pagination params', async () => {
    const app = express();
    const repo = new InMemoryBookingsRepository([
      { id: 'a', userId: uidA, deskId: 'D', date: '2025-06-15', timeSlot: '09:00', status: 'CONFIRMED' },
      { id: 'b', userId: uidA, deskId: 'D', date: '2025-06-16', timeSlot: '09:00', status: 'CONFIRMED' },
      { id: 'c', userId: uidA, deskId: 'D', date: '2025-06-17', timeSlot: '09:00', status: 'CONFIRMED' },
    ]);
    app.use(express.json());
    app.use('/', registerBookingsRoutes(express.Router(), repo));

    const res = await request(app)
      .get('/api/bookings/my?page=2&pageSize=1')
      .set('x-user-id', uidA);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.pageSize).toBe(1);
    expect(res.body.data.items.length).toBe(1);
  });
});
