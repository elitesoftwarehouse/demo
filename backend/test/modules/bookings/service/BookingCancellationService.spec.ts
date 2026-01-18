import { Booking, BookingState } from '../../../../src/modules/bookings/domain/entities/Booking';
import { BookingCancellationService, IBookingRepository } from '../../../../src/modules/bookings/service/BookingCancellationService';

class InMemoryBookingRepo implements IBookingRepository {
  private items = new Map<string, Booking>();
  add(b: Booking) { this.items.set(b.id, b); }
  async findById(id: string): Promise<Booking | null> { return this.items.get(id) || null; }
  async save(booking: Booking): Promise<Booking> { this.items.set(booking.id, booking); return booking; }
}

function addHours(date: Date, h: number) { return new Date(date.getTime() + h * 3600 * 1000); }
function addMinutes(date: Date, m: number) { return new Date(date.getTime() + m * 60 * 1000); }

describe('BookingCancellationService - 24h constraint', () => {
  const userId = 'user-1';
  const otherId = 'user-2';

  it('allows cancellation when more than 24h remain', async () => {
    const repo = new InMemoryBookingRepo();
    const now = new Date('2026-01-01T10:00:00Z');
    const booking = new Booking({ id: 'b1', userId, startAt: addHours(now, 24 + 1), status: BookingState.ATTIVA });
    repo.add(booking);

    const svc = new BookingCancellationService(repo);
    const res = await svc.cancelBooking('b1', userId, now);

    expect(res.success).toBe(true);
    expect(res.booking?.status).toBe(BookingState.CANCELLATA_DA_UTENTE);
    expect(res.booking?.cancelledAt).toBeTruthy();
    expect(res.booking?.cancelledBy).toBe(userId);
  });

  it('denies cancellation when exactly 24h remain (boundary)', async () => {
    const repo = new InMemoryBookingRepo();
    const now = new Date('2026-01-01T10:00:00Z');
    const booking = new Booking({ id: 'b2', userId, startAt: addHours(now, 24), status: BookingState.ATTIVA });
    repo.add(booking);

    const svc = new BookingCancellationService(repo);
    const res = await svc.cancelBooking('b2', userId, now);

    expect(res.success).toBe(false);
    expect(res.reason).toBe('TOO_LATE');
  });

  it('denies cancellation when less than 24h remain (23h59m)', async () => {
    const repo = new InMemoryBookingRepo();
    const now = new Date('2026-01-01T10:00:00Z');
    const start = addHours(now, 23);
    const startMinus = addMinutes(start, 59); // 23h59m
    const booking = new Booking({ id: 'b3', userId, startAt: startMinus, status: BookingState.ATTIVA });
    repo.add(booking);

    const svc = new BookingCancellationService(repo);
    const res = await svc.cancelBooking('b3', userId, now);

    expect(res.success).toBe(false);
    expect(res.reason).toBe('TOO_LATE');
  });

  it('denies cancellation for booking not owned by user', async () => {
    const repo = new InMemoryBookingRepo();
    const now = new Date('2026-01-01T10:00:00Z');
    const booking = new Booking({ id: 'b4', userId: otherId, startAt: addHours(now, 48), status: BookingState.ATTIVA });
    repo.add(booking);

    const svc = new BookingCancellationService(repo);
    const res = await svc.cancelBooking('b4', userId, now);

    expect(res.success).toBe(false);
    expect(res.reason).toBe('FORBIDDEN_NOT_OWNER');
  });

  it('denies cancellation when already cancelled', async () => {
    const repo = new InMemoryBookingRepo();
    const now = new Date('2026-01-01T10:00:00Z');
    const booking = new Booking({ id: 'b5', userId, startAt: addHours(now, 72), status: BookingState.CANCELLATA });
    repo.add(booking);

    const svc = new BookingCancellationService(repo);
    const res = await svc.cancelBooking('b5', userId, now);

    expect(res.success).toBe(false);
    expect(res.reason).toBe('ALREADY_CANCELLED');
  });

  it('sets correct fields on success (status, cancelledAt, cancelledBy)', async () => {
    const repo = new InMemoryBookingRepo();
    const now = new Date('2026-02-01T12:00:00Z');
    const booking = new Booking({ id: 'b6', userId, startAt: addHours(now, 30), status: BookingState.ATTIVA });
    repo.add(booking);

    const svc = new BookingCancellationService(repo);
    const res = await svc.cancelBooking('b6', userId, now);

    expect(res.success).toBe(true);
    const saved = res.booking!;
    expect(saved.status).toBe(BookingState.CANCELLATA_DA_UTENTE);
    expect(saved.cancelledBy).toBe(userId);
    expect(saved.cancelledAt?.toISOString()).toBe(now.toISOString());
  });

  it('timezone handling uses UTC timestamps', async () => {
    // Simulate local coworking timezone different from server by crafting dates with Z suffix
    const repo = new InMemoryBookingRepo();
    const serverNowUtc = new Date('2026-03-10T08:00:00Z'); // server UTC time
    const localBookingStartUtc = new Date('2026-03-11T09:00:00Z'); // e.g., local 10:00 in CET (UTC+1)
    const booking = new Booking({ id: 'b7', userId, startAt: localBookingStartUtc, status: BookingState.ATTIVA });
    repo.add(booking);

    const svc = new BookingCancellationService(repo);
    const res = await svc.cancelBooking('b7', userId, serverNowUtc);

    // diff = 25h -> allowed regardless of timezone label because we compare epoch ms
    expect(res.success).toBe(true);
  });
});
