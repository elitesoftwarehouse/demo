import * as express from 'express';
const request = require('supertest');
import { registerDeskRoutes } from '../../../../src/modules/desks';
import { InMemoryDeskRepository } from '../../../../src/modules/desks';

describe('DeskController GET /api/postazioni/status', () => {
  it('returns 200 with 12 desks and cache header', async () => {
    const app = express();
    const repo = new InMemoryDeskRepository();
    app.use('/', registerDeskRoutes(express.Router(), repo));

    // Set a few different statuses
    await repo.setStatus('desk-1', 'OCCUPATA');
    await repo.setStatus('desk-5', 'NON_DISPONIBILE');

    const res = await request(app).get('/api/postazioni/status');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control'] || '').toContain('max-age=2');
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);
    expect(res.body.data.length).toBe(12);

    const d1 = res.body.data.find((d: any) => d.id === 'desk-1');
    const d5 = res.body.data.find((d: any) => d.id === 'desk-5');
    expect(d1.status).toBe('OCCUPATA');
    expect(d5.status).toBe('NON_DISPONIBILE');
  });
});
