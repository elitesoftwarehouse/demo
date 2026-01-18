import * as express from 'express';
const request = require('supertest');
import { registerCalendarRoutes } from '../../../../src/modules/calendar/http/routes';

describe('Calendar API - disabled dates', () => {
  const app = express();
  app.use('/', registerCalendarRoutes(express.Router()));

  it('returns 400 for missing/invalid params', async () => {
    const r1 = await request(app).get('/api/calendar/disabled-dates');
    expect(r1.status).toBe(400);

    const r2 = await request(app).get('/api/calendar/disabled-dates?from=2026-01-01&to=bad');
    expect(r2.status).toBe(400);
  });

  it('returns disabled dates including Sundays and holidays', async () => {
    const res = await request(app).get('/api/calendar/disabled-dates?from=2026-04-05&to=2026-04-07');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const list: string[] = res.body.data.disabledDates;
    // 2026-04-05 is a Sunday (also Easter Sunday), 2026-04-06 is Easter Monday
    expect(list).toContain('2026-04-05');
    expect(list).toContain('2026-04-06');
  });

  it('enforces max range of one year', async () => {
    const res = await request(app).get('/api/calendar/disabled-dates?from=2026-01-01&to=2027-12-31');
    expect(res.status).toBe(400);
  });
});
