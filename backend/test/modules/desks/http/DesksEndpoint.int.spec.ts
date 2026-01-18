import * as express from 'express';
const request = require('supertest');
import { registerDeskRoutes } from '../../../../src/modules/desks/http/routes';
import { InMemoryDesksRepository } from '../../../../src/modules/desks/repository/DesksRepository';

const sample = [
  { id: 'D1', name: 'Desk 1', status: 'FREE' as const },
  { id: 'D2', name: 'Desk 2', status: 'OCCUPIED' as const },
  { id: 'D3', name: 'Desk 3', status: 'UNAVAILABLE' as const },
];

describe('GET /api/desks endpoint', () => {
  it('returns expected shape and counts', async () => {
    const app = express();
    const repo = new InMemoryDesksRepository(sample);
    app.use(express.json());
    app.use('/', registerDeskRoutes(express.Router(), repo));

    const res = await request(app).get('/api/desks');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.total).toBe(3);
    expect(data.expected).toBe(12);
    expect(data.missing).toBe(9);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items[0]).toHaveProperty('id', 'D1');
    expect(data.statusCount).toEqual({ FREE: 1, OCCUPIED: 1, UNAVAILABLE: 1 });
  });
});
