import * as express from 'express';
const request = require('supertest');
import { registerBookingRoutes } from '../../../../src/modules/desks/http';
import { InMemoryBookingRepository } from '../../../../src/modules/desks/repository/BookingRepository';
import { HolidaysService } from '../../../../src/modules/desks/service/HolidaysService';

function buildApp(holidays?: HolidaysService) {
  const app = express();
  app.use(express.json());
  const repo = new InMemoryBookingRepository();
  const { Router } = require('express');
  const router = Router();
  const ctrl = require('../../../../src/modules/desks/http/BookingController');
  const controller = ctrl.BookingController.build(repo, holidays);
  router.post('/api/prenotazioni', controller.create);
  app.use('/', router);
  return { app, repo };
}

describe('Booking API - create with closed days validation', () => {
  it('rejects 422 when date is a Sunday (closed)', async () => {
    const holidays = new HolidaysService({ sundaysEnabled: true });
    const { app } = buildApp(holidays);
    // Find next Sunday
    const d = new Date();
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const ymd = `${y}-${m}-${day}`;

    const res = await request(app)
      .post('/api/prenotazioni')
      .send({ userId: 'u1', deskId: 'd1', date: ymd });

    expect(res.status).toBe(422);
    expect(res.body?.error?.code).toBe('COWORKING_CLOSED');
  });

  it('creates booking 201 on a working day', async () => {
    const holidays = new HolidaysService({ sundaysEnabled: true });
    const { app } = buildApp(holidays);

    // pick a date likely not Sunday: next Monday
    const d = new Date();
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const res = await request(app)
      .post('/api/prenotazioni')
      .send({ userId: 'u1', deskId: 'd1', date: ymd, timeSlot: 'FULL_DAY' });

    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.deskId).toBe('d1');
  });

  it('returns conflict 409 when same desk/date/timeslot exists', async () => {
    const holidays = new HolidaysService({ sundaysEnabled: true });
    const { app } = buildApp(holidays);

    const d = new Date();
    while (d.getDay() !== 2) d.setDate(d.getDate() + 1); // Tuesday
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    await request(app).post('/api/prenotazioni').send({ userId: 'u1', deskId: 'd1', date: ymd, timeSlot: 'MORNING' });
    const res = await request(app).post('/api/prenotazioni').send({ userId: 'u2', deskId: 'd1', date: ymd, timeSlot: 'MORNING' });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('BOOKING_CONFLICT');
  });
});
