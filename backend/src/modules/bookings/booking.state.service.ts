/**
 * Booking state domain service
 * Centralized logic to determine booking state (PASSATA, ATTIVA, CANCELLATA).
 *
 * Rules
 * - CANCELLATA: if booking has been explicitly canceled (flag/field/command at domain level)
 * - PASSATA: not canceled AND booking end time is before now. With date-only bookings, we
 *            consider the whole day; equivalently: booking.date < today (UTC)
 * - ATTIVA: not canceled AND booking end time >= now. With date-only bookings: date >= today (UTC)
 *
 * Timezone handling
 * - We operate in UTC consistently. Dates are normalized to ISO YYYY-MM-DD for comparisons.
 */

import type { BookingState } from './booking.model';

export interface ComputeStateInput {
  date: Date; // date-only (UTC midnight)
  canceled?: boolean; // explicit cancellation flag from domain action (if available)
}

export function toIsoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeBookingState(input: ComputeStateInput, now?: Date): BookingState {
  const { date, canceled } = input;
  if (canceled) return 'CANCELLATA';

  // Compare date-only in UTC to today's date in UTC
  const todayIso = toIsoDateUTC(now ?? new Date());
  const bookingIso = toIsoDateUTC(date);

  if (bookingIso < todayIso) return 'PASSATA';
  return 'ATTIVA';
}
