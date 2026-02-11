import type { UserBookingItemDto } from '../../api/bookingsClient';

/**
 * Sort bookings by chronological order (nearest first).
 * - Primary key: startDate ascending
 * - Secondary key: endDate ascending (nulls last)
 * - Tertiary key: deskId lexicographically to stabilize order
 */
export function sortBookings(items: UserBookingItemDto[]): UserBookingItemDto[] {
  return [...items].sort((a, b) => compareBooking(a, b));
}

function toTime(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY; // null endDate sorts last
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

export function compareBooking(a: UserBookingItemDto, b: UserBookingItemDto): number {
  const sa = Date.parse(a.startDate);
  const sb = Date.parse(b.startDate);
  const dStart = (Number.isFinite(sa) ? sa : 0) - (Number.isFinite(sb) ? sb : 0);
  if (dStart !== 0) return dStart;

  const ea = toTime(a.endDate);
  const eb = toTime(b.endDate);
  if (ea !== eb) return ea - eb;

  if (a.deskId !== b.deskId) return a.deskId.localeCompare(b.deskId);
  return (a.id || '').localeCompare(b.id || '');
}
