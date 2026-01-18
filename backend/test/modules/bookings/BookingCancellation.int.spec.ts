import * as express from 'express';
const request = require('supertest');
import { registerBookingRoutes } from '../../../src/modules/bookings/http/routes';
import { InMemoryBookingRepository } from '../../../src/modules/bookings/repository/BookingRepository';
import { JwtService } from '../../../src/core/security/JwtService';

function buildApp(repo: InMemoryBookingRepository, jwt = new JwtService({ accessSecret: 'S', issuer: 'i', audience: 'a' })) {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  app.use('/', registerBookingRoutes(router, repo));

  // helper route to create token
  app.get('/__token/:uid', (req: any, res: any) => {
    const { token } = jwt.signAccessToken(req.params.uid, `${req.params.uid}@example.com`);
    res.json({ token });
  });

  return { app, jwt };
}

describe('Booking cancellation API - 24h rule', () => {
  it('allows cancellation when more than 24h remain', async () => {
    const now = Date.now();
    const repo = new InMemoryBookingRepository([
      {
        id: 'b1',
        user_id: 'u1',
        desk_id: 'd1',
        date: new Date(now + 3 * 24 * 3600 * 1000),
        start_at: new Date(now + 3 * 24 * 3600 * 1000),
        status: 'CONFIRMED',
        state: 'ATTIVA',
      },
    ]);
    const { app, jwt } = buildApp(repo);
    const { token } = jwt.signAccessToken('u1', 'u1@example.com');

    const res = await request(app)
      .delete('/api/bookings/b1')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'change of plans' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.state).toBe('CANCELLATA');
  });

  it('rejects cancellation when within 24h', async () => {
    const now = Date.now();
    const repo = new InMemoryBookingRepository([
      {
        id: 'b2',
        user_id: 'u2',
        desk_id: 'd1',
        date: new Date(now + 6 * 3600 * 1000),
        start_at: new Date(now + 6 * 3600 * 1000),
        status: 'CONFIRMED',
        state: 'ATTIVA',
      },
    ]);
    const { app, jwt } = buildApp(repo);
    const { token } = jwt.signAccessToken('u2', 'u2@example.com');

    const res = await request(app)
      .post('/api/bookings/b2/cancel')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'last minute' });

    expect([400, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('rejects cancellation of someone else\'s booking', async () => {
    const now = Date.now();
    const repo = new InMemoryBookingRepository([
      {
        id: 'b3',
        user_id: 'owner',
        desk_id: 'd1',
        date: new Date(now + 48 * 3600 * 1000),
        start_at: new Date(now + 48 * 3600 * 1000),
        status: 'CONFIRMED',
        state: 'ATTIVA',
      },
    ]);
    const { app, jwt } = buildApp(repo);
    const { token } = jwt.signAccessToken('intruder', 'i@example.com');

    const res = await request(app)
      .delete('/api/bookings/b3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
