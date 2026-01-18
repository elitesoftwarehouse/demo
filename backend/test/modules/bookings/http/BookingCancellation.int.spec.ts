import * as express from 'express';
const request = require('supertest');
import { Booking, BookingState } from '../../../../src/modules/bookings/domain/entities/Booking';
import { BookingCancellationService, IBookingRepository } from '../../../../src/modules/bookings/service/BookingCancellationService';
import { BookingController } from '../../../../src/modules/bookings/http/BookingController';

class InMemoryBookingRepo implements IBookingRepository {
  private items = new Map<string, Booking>();
  add(b: Booking) { this.items.set(b.id, b); }
  async findById(id: string): Promise<Booking | null> { return this.items.get(id) || null; }
  async save(booking: Booking): Promise<Booking> { this.items.set(booking.id, booking); return booking; }
}

function buildApp(repo: InMemoryBookingRepo) {
  const app = express();
  app.use(express.json());
  const svc = new BookingCancellationService(repo);
  const ctrl = new BookingController(svc);

  // Fake auth middleware to put user on req
  app.use((req: any, _res, next) => { req.user = { id: req.headers['x-user-id'] || 'user-1' }; next(); });
  app.post('/api/bookings/:id/cancel', (req, res) => ctrl.cancel(req as any, res as any));
  return app;
}

describe('Booking cancellation API - integration', () => {
  it('returns 200 on valid cancellation (>24h)', async () => {
    const repo = new InMemoryBookingRepo();
    const now = new Date('2026-01-01T10:00:00Z');
    const booking = new Booking({ id: 'b10', userId: 'user-1', startAt: new Date('2026-01-02T12:00:00Z'), status: BookingState.ATTIVA });
    repo.add(booking);
    const app = buildApp(repo);

    // mock Date.now to fixed timestamp
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const res = await request(app).post('/api/bookings/b10/cancel').set('x-user-id', 'user-1').send({});
    spy.mockRestore();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CANCELLATA_DA_UTENTE');
  });

  it('returns 409 on boundary 24h', async () => {
    const repo = new InMemoryBookingRepo();
    const now = new Date('2026-01-01T10:00:00Z');
    const booking = new Booking({ id: 'b11', userId: 'user-1', startAt: new Date('2026-01-02T10:00:00Z'), status: BookingState.ATTIVA });
    repo.add(booking);
    const app = buildApp(repo);

    const spy = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const res = await request(app).post('/api/bookings/b11/cancel').set('x-user-id', 'user-1').send({});
    spy.mockRestore();

    expect(res.status).toBe(409);
  });

  it('returns 403 when not owner', async () => {
    const repo = new InMemoryBookingRepo();
    const now = new Date('2026-01-01T10:00:00Z');
    const booking = new Booking({ id: 'b12', userId: 'owner', startAt: new Date('2026-01-05T10:00:00Z'), status: BookingState.ATTIVA });
    repo.add(booking);
    const app = buildApp(repo);

    const spy = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const res = await request(app).post('/api/bookings/b12/cancel').set('x-user-id', 'user-1').send({});
    spy.mockRestore();

    expect(res.status).toBe(403);
  });
});
