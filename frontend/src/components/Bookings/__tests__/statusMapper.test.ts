import { bookingStateLabelKey, bookingStateColors, normalizeBookingState } from '../statusMapper';

describe('statusMapper', () => {
  test('normalizeBookingState maps various inputs', () => {
    expect(normalizeBookingState('ACTIVE')).toBe('active');
    expect(normalizeBookingState('ATTIVA')).toBe('active');
    expect(normalizeBookingState('PAST')).toBe('passed');
    expect(normalizeBookingState('PASSATA')).toBe('passed');
    expect(normalizeBookingState('CANCELLED')).toBe('cancelled');
    expect(normalizeBookingState('CANCELLATA')).toBe('cancelled');
    expect(normalizeBookingState('unknown')).toBe('unknown');
  });

  test('bookingStateLabelKey returns i18n keys', () => {
    expect(bookingStateLabelKey('active')).toBe('bookings.status.active');
    expect(bookingStateLabelKey('passed')).toBe('bookings.status.passed');
    expect(bookingStateLabelKey('cancelled')).toBe('bookings.status.cancelled');
    expect(bookingStateLabelKey('unknown')).toBe('bookings.status.unknown');
  });

  test('bookingStateColors returns contrasting colors', () => {
    const active = bookingStateColors('active');
    expect(active.bg).toBeTruthy();
    expect(active.fg).toBe('#ffffff');
  });
});
