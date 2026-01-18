import { BookingService } from '../../../../src/modules/desks/service/BookingService';

// Fake HolidaysService exposing isDateClosed API used by BookingService
class FakeHolidaysService {
  private closedDates = new Set<string>();
  private weekly: number[] = [];
  setClosedDates(dates: string[]) {
    this.closedDates = new Set(dates);
  }
  setWeeklyClosures(days: number[]) {
    this.weekly = days;
  }
  isDateClosed(date: string): boolean {
    // date: YYYY-MM-DD
    if (this.closedDates.has(date)) return true;
    const d = new Date(date + 'T00:00:00.000Z');
    const weekday = d.getUTCDay();
    if (this.weekly.includes(weekday)) return true;
    return false;
  }
}

// Fake booking repository implementing the interface expected by BookingService
class FakeBookingRepository {
  public items: any[] = [];

  async findConflicts(deskId: string, date: string, timeSlot: string | null) {
    return this.items.filter(
      (b) => b.deskId === deskId && b.date === date && (timeSlot ? b.timeSlot === timeSlot : true)
    );
  }

  async create(data: any) {
    const now = new Date();
    const rec = {
      id: 'b-' + (this.items.length + 1),
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    this.items.push(rec);
    return rec;
  }
}

describe('BookingService - createBooking with closed-days and conflicts', () => {
  it('creates booking when date is open', async () => {
    const repo = new FakeBookingRepository();
    const holidays = new FakeHolidaysService();
    holidays.setClosedDates(['2026-07-15']); // different day closed

    const svc = new BookingService(repo as any, holidays as any);

    const payload = { deskId: 'd1', userId: 'u1', date: '2026-07-10', timeSlot: '09:00-13:00' } as any;
    const res = await svc.createBooking(payload);

    expect(res).toHaveProperty('id');
    expect(res.deskId).toBe('d1');
    expect(res.userId).toBe('u1');
    expect(res.date).toBe('2026-07-10');
    expect(res.timeSlot).toBe('09:00-13:00');
    expect(res.status).toBe('CONFIRMED');
  });

  it('rejects with COWORKING_CLOSED when date is closed', async () => {
    const repo = new FakeBookingRepository();
    const holidays = new FakeHolidaysService();
    holidays.setClosedDates(['2026-07-10']);

    const svc = new BookingService(repo as any, holidays as any);

    const payload = { deskId: 'd1', userId: 'u1', date: '2026-07-10', timeSlot: '09:00-13:00' } as any;
    await expect(svc.createBooking(payload)).rejects.toMatchObject({ code: 'COWORKING_CLOSED' });
    expect(repo.items.length).toBe(0);
  });

  it('rejects missing required fields', async () => {
    const repo = new FakeBookingRepository();
    const holidays = new FakeHolidaysService();
    const svc = new BookingService(repo as any, holidays as any);

    // @ts-expect-error testing runtime behavior
    await expect(svc.createBooking({})).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    // wrong date format
    // @ts-expect-error testing runtime behavior
    await expect(svc.createBooking({ userId: 'u1', deskId: 'd1', date: '10/07/2026' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects with conflict when same desk and date already booked (timeslot-aware)', async () => {
    const repo = new FakeBookingRepository();
    const holidays = new FakeHolidaysService();
    const svc = new BookingService(repo as any, holidays as any);

    const payload = { deskId: 'd1', userId: 'u1', date: '2026-07-10', timeSlot: '09:00-13:00' } as any;
    await svc.createBooking(payload);

    await expect(svc.createBooking({ deskId: 'd1', userId: 'u2', date: '2026-07-10', timeSlot: '09:00-13:00' } as any)).rejects.toMatchObject({ code: 'BOOKING_CONFLICT' });

    // Different timeslot on same day should also conflict per current rule (if timeSlot provided we check equality)
    const okDifferentSlot = await svc.createBooking({ deskId: 'd1', userId: 'u3', date: '2026-07-10', timeSlot: '14:00-18:00' } as any);
    expect(okDifferentSlot.id).toBeTruthy();
  });

  it('rejects when weekly closure (Sunday) applies', async () => {
    const repo = new FakeBookingRepository();
    const holidays = new FakeHolidaysService();
    holidays.setWeeklyClosures([0]); // Sunday
    const svc = new BookingService(repo as any, holidays as any);

    // 2026-03-01 is a Sunday
    await expect(svc.createBooking({ deskId: 'd1', userId: 'u1', date: '2026-03-01', timeSlot: '10:00-12:00' } as any)).rejects.toMatchObject({ code: 'COWORKING_CLOSED' });
  });
});
