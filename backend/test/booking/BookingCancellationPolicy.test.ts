import { canUserCancel } from '../../src/modules/booking/domain/services/BookingCancellationPolicy';

// Helper to build ISO string (UTC)
function toUtc(y: number, m: number, d: number, hh = 0, mm = 0, ss = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
}

describe('BookingCancellationPolicy.canUserCancel', () => {
  describe('basic 24h rule (Europe/Rome default)', () => {
    // Choose a date in DST period (April 10, 2026) — Europe/Rome offset +02:00
    // Therefore start instant for 09:00 local is 07:00Z
    const bookingDate = '2026-04-10';
    const startInstantUtc = toUtc(2026, 4, 10, 7, 0, 0); // 09:00 Europe/Rome

    it('allows cancellation when more than 24 hours remain', () => {
      const now = toUtc(2026, 4, 9, 6, 59, 59); // 24h + 1s before
      const res = canUserCancel({ date: bookingDate, now });
      expect(res.allowed).toBe(true);
    });

    it('denies cancellation when exactly 24 hours remain (boundary)', () => {
      const now = toUtc(2026, 4, 9, 7, 0, 0); // exactly 24h before start
      const res = canUserCancel({ date: bookingDate, now });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('window_less_than_24h');
    });

    it('denies cancellation when less than 24 hours remain (e.g., 23h59m)', () => {
      const now = toUtc(2026, 4, 9, 7, 1, 0); // 23h59m before
      const res = canUserCancel({ date: bookingDate, now });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('window_less_than_24h');
    });
  });

  it('denies cancellation if booking is already cancelled', () => {
    const bookingDate = '2026-05-15';
    const now = toUtc(2026, 5, 14, 7, 0, 0);
    const res = canUserCancel({ date: bookingDate, now, cancelledAt: toUtc(2026, 5, 1, 12, 0, 0) });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('already_cancelled');
  });

  describe('timezone handling', () => {
    // DST change in Europe/Rome: 2026-03-29 (last Sunday of March)
    // 09:00 Europe/Rome on 2026-03-29 is 07:00Z (UTC+2)
    const bookingDate = '2026-03-29';

    it('uses Europe/Rome (default) so exactly 24h before 09:00 local is denied', () => {
      const now = toUtc(2026, 3, 28, 7, 0, 0); // exactly 24h before 09:00 Europe/Rome (07:00Z)
      const res = canUserCancel({ date: bookingDate, now });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('window_less_than_24h');
    });

    it('changing tz to UTC shifts the start instant to 09:00Z, allowing >24h window with the same now', () => {
      const now = toUtc(2026, 3, 28, 7, 0, 0);
      const res = canUserCancel({ date: bookingDate, now, tz: 'UTC' }); // start at 09:00Z -> 26h difference
      expect(res.allowed).toBe(true);
    });
  });
});
