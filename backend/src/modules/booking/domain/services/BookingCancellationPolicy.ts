// BookingCancellationPolicy — business rule: a user can cancel their booking only if more than 24 hours remain
// before the booking start time. Timezone reference: Europe/Rome. Start time is derived from startAt if present,
// otherwise 09:00 local time on the booking date (compatibility with date-only bookings).

export type CanCancelInput = {
  // Booking date-only (YYYY-MM-DD) as stored, always required
  date: string;
  // Booking window start. If provided, used as the source of truth.
  startAt?: string | Date | null;
  // Optional: pre-existing cancellation timestamp (if already cancelled)
  cancelledAt?: string | Date | null;
  // Optional override of current instant (UTC)
  now?: Date;
  // Target timezone
  tz?: string; // default 'Europe/Rome'
};

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function parseIsoOrDate(input: string | Date): Date | null {
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function buildStartInstant(input: CanCancelInput): Date {
  const tz = input.tz || 'Europe/Rome';
  if (input.startAt) {
    const d = parseIsoOrDate(input.startAt);
    if (d) return d;
  }
  // Fallback: combine date + 09:00 in target TZ, then convert to UTC Date
  // We use Intl to get correct components in TZ and construct a Date by formatting
  const [y, m, d] = input.date.split('-').map(Number);
  // Build local time 09:00 in Europe/Rome; Intl does not create Date, so we approximate by using
  // the fact that Date.UTC creates a UTC date and we adjust with the timezone offset at that local time.
  // Construct a Date representing 09:00 Europe/Rome on the given date.
  // Approach: create a Date for 09:00 in UTC, then shift by the TZ offset difference.
  const approx = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 9, 0, 0));
  // Compute the offset of Europe/Rome at that local wall-clock time using Intl
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const parts = fmt.formatToParts(approx);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const target = new Date(`${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:00.000Z`);
  return target;
}

export function canUserCancel(input: CanCancelInput): { allowed: boolean; reason?: string } {
  if (input.cancelledAt) return { allowed: false, reason: 'already_cancelled' };
  const startInstant = buildStartInstant(input);
  const now = input.now ?? new Date();
  const diffMs = startInstant.getTime() - now.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  if (hours > 24) return { allowed: true };
  return { allowed: false, reason: 'window_less_than_24h' };
}
