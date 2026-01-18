import * as express from 'express';
const request = require('supertest');
import { registerBookingRoutes } from '../../../../src/modules/bookings/http/routes';
import { InMemoryBookingRepository } from '../../../../src/modules/bookings/repository/InMemoryBookingRepository';

function buildApp() {
  const app = express();
  app.use(express.json());
  const repo = new InMemoryBookingRepository();
  app.use('/', registerBookingRoutes(express.Router(), repo));
  return { app, repo };
}

function isoAdd(base: Date, ms: number) {
  return new Date(base.getTime() + ms).toISOString();
}

describe('Bookings API - state management and client-provided stato ignored', () => {
  it('creates a future booking and returns ATTIVA even if client sends stato', async () => {
    const { app } = buildApp();
    const now = new Date();
    const start = isoAdd(now, 60 * 60 * 1000); // +1h
    const end = isoAdd(now, 2 * 60 * 60 * 1000); // +2h

    const res = await request(app)
      .post('/api/bookings')
      .send({ startAt: start, endAt: end, stato: 'CANCELLATA' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stato).toBe('ATTIVA');
  });

  it('creates a past booking and returns PASSATA', async () => {
    const { app } = buildApp();
    const now = new Date();
    const start = isoAdd(now, -2 * 60 * 60 * 1000); // -2h
    const end = isoAdd(now, -1 * 60 * 60 * 1000); // -1h

    const res = await request(app).post('/api/bookings').send({ startAt: start, endAt: end });
    expect(res.status).toBe(201);
    expect(res.body.data.stato).toBe('PASSATA');
  });

  it('cancels a booking and state becomes CANCELLATA; cannot be reverted by update', async () => {
    const { app } = buildApp();
    const now = new Date();
    const start = isoAdd(now, 60 * 60 * 1000);
    const end = isoAdd(now, 2 * 60 * 60 * 1000);

    const created = await request(app).post('/api/bookings').send({ startAt: start, endAt: end });
    const id = created.body.data.id;

    const cancel = await request(app).post(`/api/bookings/${id}/cancel`).send({});
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.stato).toBe('CANCELLATA');

    // Try to revert by update with stato
    const upd = await request(app).put(`/api/bookings/${id}`).send({ stato: 'ATTIVA' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.stato).toBe('CANCELLATA');
  });

  it('list and detail return consistent stato', async () => {
    const { app } = buildApp();
    const now = new Date();
    const startF = isoAdd(now, 60 * 60 * 1000);
    const endF = isoAdd(now, 2 * 60 * 60 * 1000);
    const startP = isoAdd(now, -2 * 60 * 60 * 1000);
    const endP = isoAdd(now, -1 * 60 * 60 * 1000);

    const f = await request(app).post('/api/bookings').send({ startAt: startF, endAt: endF });
    const p = await request(app).post('/api/bookings').send({ startAt: startP, endAt: endP });

    const list = await request(app).get('/api/bookings');
    const states = list.body.data.map((i: any) => i.stato).sort();
    expect(states).toEqual(['ATTIVA', 'PASSATA']);

    const d1 = await request(app).get(`/api/bookings/${f.body.data.id}`);
    const d2 = await request(app).get(`/api/bookings/${p.body.data.id}`);
    expect(d1.body.data.stato).toBe('ATTIVA');
    expect(d2.body.data.stato).toBe('PASSATA');
  });

  it('cannot cancel a past booking (business rule)', async () => {
    const { app } = buildApp();
    const now = new Date();
    const start = isoAdd(now, -2 * 60 * 60 * 1000);
    const end = isoAdd(now, -1 * 60 * 60 * 1000);
    const created = await request(app).post('/api/bookings').send({ startAt: start, endAt: end });

    const cancel = await request(app).post(`/api/bookings/${created.body.data.id}/cancel`).send({});
    expect(cancel.status).toBe(400);
  });
});
