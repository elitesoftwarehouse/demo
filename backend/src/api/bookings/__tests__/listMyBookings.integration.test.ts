import { listMyBookingsHandler } from '../bookings.controller';
import * as repo from '../../../modules/bookings/booking.repository';

// Mock calendar service to avoid importing complex dependencies
jest.mock('../../../modules/calendar/holiday.service', () => ({
  computeDisabledDates: () => [],
  parseIsoDate: (s: string) => new Date(s),
}));

// Simple ResponseLike mock
function createRes() {
  const res: any = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
    },
  };
  return res;
}

describe('GET /api/bookings/me - integration (controller level)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requires authentication', async () => {
    const req: any = { user: undefined, query: {} };
    const res = createRes();
    await listMyBookingsHandler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'unauthorized' });
  });

  it('returns only current user bookings, preserves paging and field format', async () => {
    const req: any = { user: { id: 'u1', email: 'a@b.c', roles: [] }, query: { page: '2', size: '1' } };
    const res = createRes();

    const mocked = jest.spyOn(repo, 'listUserBookings').mockResolvedValue({
      items: [
        { id: 'b2', startDate: '2025-01-12', endDate: null, deskId: 'd2', status: 'confirmed', notes: null, tags: null },
      ],
      page: 2,
      size: 1,
      total: 3,
    });

    await listMyBookingsHandler(req, res);

    expect(mocked).toHaveBeenCalledWith('u1', { page: 2, size: 1, includeCanceled: false });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      page: 2,
      size: 1,
      total: 3,
      items: [
        { id: 'b2', startDate: '2025-01-12', endDate: null, deskId: 'd2', status: 'confirmed', notes: null, tags: null },
      ],
    });
  });

  it('parses includeCanceled flag', async () => {
    const req: any = { user: { id: 'u1', email: 'a@b.c', roles: [] }, query: { includeCanceled: 'true' } };
    const res = createRes();

    const mocked = jest.spyOn(repo, 'listUserBookings').mockResolvedValue({ items: [], page: 1, size: 20, total: 0 });

    await listMyBookingsHandler(req, res);

    expect(mocked).toHaveBeenCalledWith('u1', { page: 1, size: 20, includeCanceled: true });
    expect(res.statusCode).toBe(200);
  });
});
