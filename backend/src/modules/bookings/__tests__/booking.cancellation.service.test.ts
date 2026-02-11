import { canUserCancelBooking, computeStartAt, decideCancellation } from '../booking.cancellation.service';

// declare jest for TS without types
declare const jest: any;

describe('booking.cancellation.service - policy decisions', () => {
  const cfg = { defaultStartHourUtc: 9, defaultStartMinuteUtc: 0, cutoffHours: 24 } as const;

  function d(iso: string) { return new Date(iso); }

  test('allows cancellation when more than 24h before start', () => {
    // Booking date 2026-01-10 09:00Z, now is 2026-01-09 08:59Z => 24h01m remaining
    const date = d('2026-01-10T00:00:00.000Z');
    const startAt = computeStartAt(date, cfg);
    const now = d('2026-01-09T08:59:00.000Z');

    const res = canUserCancelBooking({ date, startAt }, cfg, now);
    expect(res.allowed).toBe(true);
    expect(res.hoursBeforeStart && res.hoursBeforeStart).toBeGreaterThan(24);
  });

  test('denies cancellation exactly at 24h boundary', () => {
    const date = d('2026-01-10T00:00:00.000Z');
    const startAt = computeStartAt(date, cfg); // 2026-01-10 09:00Z
    const now = d('2026-01-09T09:00:00.000Z');

    const res = canUserCancelBooking({ date, startAt }, cfg, now);
    expect(res.allowed).toBe(false);
    expect(Math.round((res.hoursBeforeStart || 0) * 60)).toBe(24 * 60);
  });

  test('denies cancellation when less than 24h remain (23h59m)', () => {
    const date = d('2026-01-10T00:00:00.000Z');
    const startAt = computeStartAt(date, cfg);
    const now = d('2026-01-09T09:01:00.000Z');

    const res = canUserCancelBooking({ date, startAt }, cfg, now);
    expect(res.allowed).toBe(false);
    expect(res.hoursBeforeStart || 0).toBeLessThan(24);
  });

  test('timezone correctness: computeStartAt always uses UTC midnight + configured time', () => {
    const date = d('2026-06-15T13:45:12.000Z'); // time part should be ignored
    const startAt = computeStartAt(date, cfg);
    expect(startAt.toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });

  test('decideCancellation is a thin wrapper of canUserCancelBooking', () => {
    const date = d('2026-01-10T00:00:00.000Z');
    const startAt = computeStartAt(date, cfg);
    const now = d('2026-01-09T08:58:00.000Z');
    const res = decideCancellation({ date, startAt }, now, cfg);
    expect(res.allowed).toBe(true);
  });
});
