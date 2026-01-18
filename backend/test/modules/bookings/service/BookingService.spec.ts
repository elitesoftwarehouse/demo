import { Booking } from '../../../../src/modules/bookings/domain/entities/Booking';
import { BookingService } from '../../../../src/modules/bookings/service/BookingService';
import { InMemoryBookingRepository } from '../../../../src/modules/bookings/repository/BookingRepository';

function makeBooking(id: string, userId: string, startOffsetDays: number, durationHours: number, state: any): Booking {
  const now = new Date();
  const startAt = new Date(now.getTime() + startOffsetDays * 24 * 3600 * 1000);
  const endAt = new Date(startAt.getTime() + durationHours * 3600 * 1000);
  return new Booking({ id, userId, startAt, endAt, state, createdAt: now, updatedAt: now });
}

describe('BookingService pagination and state filtering', () => {
  it('returns correct counts and metadata without filters', async () => {
    const repo = new InMemoryBookingRepository();
    const svc = new BookingService(repo);

    const items: Booking[] = [];
    for (let i = 1; i <= 25; i++) {
      items.push(makeBooking('b' + i, 'u1', -i, 2, 'ATTIVA'));
    }
    await repo.seed(items);

    const res1 = await svc.listMyBookings({ userId: 'u1', page: 1, pageSize: 10 });
    expect(res1.items.length).toBe(10);
    expect(res1.totalItems).toBe(25);
    expect(res1.totalPages).toBe(3);
    expect(res1.hasNext).toBe(true);
    expect(res1.hasPrev).toBe(false);

    const res2 = await svc.listMyBookings({ userId: 'u1', page: 3, pageSize: 10 });
    expect(res2.items.length).toBe(5);
    expect(res2.page).toBe(3);
    expect(res2.hasNext).toBe(false);
    expect(res2.hasPrev).toBe(true);
  });

  it('applies state filter correctly (ATTIVA, PASSATA, CANCELLATA)', async () => {
    const repo = new InMemoryBookingRepository();
    const svc = new BookingService(repo);

    const items: Booking[] = [
      makeBooking('a1', 'u1', 1, 2, 'ATTIVA'),
      makeBooking('a2', 'u1', -2, 2, 'PASSATA'),
      makeBooking('a3', 'u1', -1, 2, 'CANCELLATA'),
      makeBooking('a4', 'u1', 3, 2, 'ATTIVA'),
      makeBooking('a5', 'u2', 5, 2, 'ATTIVA'), // another user
    ];
    await repo.seed(items);

    const act = await svc.listMyBookings({ userId: 'u1', page: 1, pageSize: 10, state: 'ATTIVA' as any });
    expect(act.totalItems).toBe(2);
    expect(act.items.every((b) => b.state === 'ATTIVA')).toBe(true);

    const past = await svc.listMyBookings({ userId: 'u1', page: 1, pageSize: 10, state: 'PASSATA' as any });
    expect(past.totalItems).toBe(1);
    expect(past.items[0].state).toBe('PASSATA');

    const canc = await svc.listMyBookings({ userId: 'u1', page: 1, pageSize: 10, state: 'CANCELLATA' as any });
    expect(canc.totalItems).toBe(1);
    expect(canc.items[0].state).toBe('CANCELLATA');
  });

  it('returns only authenticated user bookings and handles out-of-range pages', async () => {
    const repo = new InMemoryBookingRepository();
    const svc = new BookingService(repo);

    const items: Booking[] = [];
    for (let i = 1; i <= 12; i++) items.push(makeBooking('u1-' + i, 'u1', i, 1, 'ATTIVA'));
    for (let i = 1; i <= 7; i++) items.push(makeBooking('u2-' + i, 'u2', i, 1, 'ATTIVA'));
    await repo.seed(items);

    const res = await svc.listMyBookings({ userId: 'u1', page: 5, pageSize: 5 });
    expect(res.totalItems).toBe(12);
    expect(res.totalPages).toBe(3);
    expect(res.items.length).toBe(0); // page 5 out of range
  });

  it('edge cases: none, all in same state, small/large pageSize', async () => {
    const repo = new InMemoryBookingRepository();
    const svc = new BookingService(repo);

    await repo.seed([]);
    const empty = await svc.listMyBookings({ userId: 'u1', page: 1, pageSize: 10 });
    expect(empty.totalItems).toBe(0);
    expect(empty.totalPages).toBe(0);
    expect(empty.items.length).toBe(0);

    const allSame: Booking[] = [];
    for (let i = 1; i <= 6; i++) allSame.push(makeBooking('b' + i, 'u1', -i, 1, 'PASSATA'));
    await repo.seed(allSame);
    const allPast = await svc.listMyBookings({ userId: 'u1', state: 'PASSATA' as any, page: 1, pageSize: 2 });
    expect(allPast.totalItems).toBe(6);
    expect(allPast.items.length).toBe(2);

    const tiny = await svc.listMyBookings({ userId: 'u1', page: 1, pageSize: 1 });
    expect(tiny.items.length).toBe(1);

    const nearMax = await svc.listMyBookings({ userId: 'u1', page: 1, pageSize: 50 });
    expect(nearMax.items.length).toBe(6);
  });
});
