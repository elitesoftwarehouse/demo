import { BookingStateService } from '../../../../src/modules/bookings/service/BookingStateService';
import type { BookingLike } from '../../../../src/modules/bookings/domain/BookingTypes';

function at(iso: string): Date { return new Date(iso); }

describe('BookingStateService.computeState', () => {
  it('future booking not cancelled -> ATTIVA', () => {
    const booking: BookingLike = {
      start: at('2026-01-10T10:00:00Z'),
      end: at('2026-01-10T12:00:00Z'),
      status: 'CONFIRMED',
    };
    const now = at('2026-01-10T09:00:00Z');
    expect(BookingStateService.computeState(booking, now)).toBe('ATTIVA');
  });

  it('booking in progress (now between start and end) -> ATTIVA', () => {
    const booking: BookingLike = {
      start: at('2026-01-10T10:00:00Z'),
      end: at('2026-01-10T12:00:00Z'),
      status: 'CONFIRMED',
    };
    const now = at('2026-01-10T11:00:00Z');
    expect(BookingStateService.computeState(booking, now)).toBe('ATTIVA');
  });

  it('booking with end in the past -> PASSATA', () => {
    const booking: BookingLike = {
      start: at('2026-01-10T10:00:00Z'),
      end: at('2026-01-10T12:00:00Z'),
      status: 'CONFIRMED',
    };
    const now = at('2026-01-10T12:00:00Z'); // end exactly at now -> considered past
    expect(BookingStateService.computeState(booking, now)).toBe('PASSATA');
  });

  it('booking cancelled before start -> CANCELLATA', () => {
    const booking: BookingLike = {
      start: at('2026-01-10T10:00:00Z'),
      end: at('2026-01-10T12:00:00Z'),
      status: 'CANCELLED',
    };
    const now = at('2026-01-09T10:00:00Z');
    expect(BookingStateService.computeState(booking, now)).toBe('CANCELLATA');
  });

  it('booking cancelled after start -> CANCELLATA (cancellation has precedence)', () => {
    const booking: BookingLike = {
      start: at('2026-01-10T10:00:00Z'),
      end: at('2026-01-10T12:00:00Z'),
      status: 'CANCELLED',
    };
    const now = at('2026-01-10T11:00:00Z');
    expect(BookingStateService.computeState(booking, now)).toBe('CANCELLATA');
  });

  it('cancellation via cancelledAt timestamp -> CANCELLATA (even if now < start)', () => {
    const booking: BookingLike = {
      start: at('2026-01-10T10:00:00Z'),
      end: at('2026-01-10T12:00:00Z'),
      status: 'CONFIRMED',
      cancelledAt: at('2026-01-09T08:00:00Z'),
    };
    const now = at('2026-01-09T09:00:00Z');
    expect(BookingStateService.computeState(booking, now)).toBe('CANCELLATA');
  });

  it('priority: cancellation wins over past -> CANCELLATA not PASSATA', () => {
    const booking: BookingLike = {
      start: at('2026-01-10T10:00:00Z'),
      end: at('2026-01-10T12:00:00Z'),
      status: 'CANCELLED',
    };
    const now = at('2026-01-10T13:00:00Z');
    expect(BookingStateService.computeState(booking, now)).toBe('CANCELLATA');
  });

  it('timezone handling uses UTC instants from ISO strings', () => {
    // Using Z to ensure UTC; comparisons rely on getTime()
    const booking: BookingLike = {
      start: at('2026-06-01T08:00:00Z'),
      end: at('2026-06-01T10:00:00Z'),
    };
    const now = at('2026-06-01T09:00:00Z');
    expect(BookingStateService.computeState(booking, now)).toBe('ATTIVA');
  });

  it('no end provided: future instant -> ATTIVA', () => {
    const booking: BookingLike = { start: at('2026-01-10T10:00:00Z') };
    const now = at('2026-01-10T09:59:59Z');
    expect(BookingStateService.computeState(booking, now)).toBe('ATTIVA');
  });

  it('no end provided: start equal to now -> PASSATA (instant occurred)', () => {
    const booking: BookingLike = { start: at('2026-01-10T10:00:00Z') };
    const now = at('2026-01-10T10:00:00Z');
    expect(BookingStateService.computeState(booking, now)).toBe('PASSATA');
  });

  it('no end provided: past instant -> PASSATA', () => {
    const booking: BookingLike = { start: at('2026-01-10T10:00:00Z') };
    const now = at('2026-01-10T10:00:01Z');
    expect(BookingStateService.computeState(booking, now)).toBe('PASSATA');
  });
});
