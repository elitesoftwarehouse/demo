import { BookingCancellationService } from '../../src/modules/booking/domain/services/BookingCancellationService';
import type { Booking } from '../../src/modules/booking/domain/entities/Booking';

function toUtc(y: number, m: number, d: number, hh = 0, mm = 0, ss = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
}

function makeBooking(partial: Partial<Booking> = {}): Booking {
  const base: Booking = {
    id: 'b1',
    userId: 'u1',
    deskId: '7',
    date: '2026-04-10', // DST period: 09:00 local => 07:00Z
    startAt: null,
    endAt: null,
    status: 'ATTIVA',
    cancelledAt: null,
    cancelledByUserId: null,
    cancellationSource: null,
    cancellationReason: null,
    createdAt: toUtc(2026, 4, 1, 10, 0, 0).toISOString(),
    updatedAt: toUtc(2026, 4, 1, 10, 0, 0).toISOString(),
  };
  return { ...base, ...partial };
}

describe('BookingCancellationService.cancelBooking', () => {
  it('succeeds when more than 24h remain and sets audit fields', () => {
    const now = toUtc(2026, 4, 9, 6, 59, 59); // >24h before 09:00 local (07:00Z)
    const booking = makeBooking();
    const res = BookingCancellationService.cancelBooking({ booking, authUserId: 'u1', now });
    expect(res.updated.cancelledAt).toBe(now.toISOString());
    expect(res.updated.cancelledByUserId).toBe('u1');
    expect(res.updated.cancellationSource).toBe('USER');
    expect(res.updated.status).toBe('CANCELLATA_DA_UTENTE');
  });

  it('throws forbidden when booking is not owned by the user', () => {
    const now = toUtc(2026, 4, 9, 6, 59, 59);
    const booking = makeBooking({ userId: 'other-user' });
    expect(() => BookingCancellationService.cancelBooking({ booking, authUserId: 'u1', now })).toThrowError(/forbidden/);
  });

  it('denies when exactly 24h remain (boundary)', () => {
    const now = toUtc(2026, 4, 9, 7, 0, 0); // exactly 24h before 09:00 local
    const booking = makeBooking();
    expect(() => BookingCancellationService.cancelBooking({ booking, authUserId: 'u1', now })).toThrowError(/window_less_than_24h/);
  });

  it('denies when less than 24h remain (e.g., 23h59m)', () => {
    const now = toUtc(2026, 4, 9, 7, 1, 0); // 23h59m
    const booking = makeBooking();
    expect(() => BookingCancellationService.cancelBooking({ booking, authUserId: 'u1', now })).toThrowError(/window_less_than_24h/);
  });

  it('denies if already cancelled', () => {
    const now = toUtc(2026, 4, 9, 6, 59, 59);
    const booking = makeBooking({ cancelledAt: toUtc(2026, 4, 5, 12, 0, 0).toISOString(), status: 'CANCELLATA' });
    expect(() => BookingCancellationService.cancelBooking({ booking, authUserId: 'u1', now })).toThrowError(/already_cancelled/);
  });

  it('honors timezone when provided explicitly', () => {
    const booking = makeBooking({ date: '2026-03-29' }); // DST switch day: 09:00 Europe/Rome = 07:00Z
    const now = toUtc(2026, 3, 28, 7, 0, 0); // exactly 24h before 09:00 local
    // Europe/Rome -> deny at boundary
    expect(() => BookingCancellationService.cancelBooking({ booking, authUserId: 'u1', now, tz: 'Europe/Rome' })).toThrow();
    // UTC timezone -> start is 09:00Z so now (07:00Z) is >24h prior
    const ok = BookingCancellationService.cancelBooking({ booking, authUserId: 'u1', now, tz: 'UTC' });
    expect(ok.updated.cancelledAt).toBe(now.toISOString());
  });
});
