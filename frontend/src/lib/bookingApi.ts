// bookingApi - utilities to interact with bookings backend endpoints
// - cancelBooking: POST /api/bookings/:id/cancel (assumed)
// - Provides helpers to determine client-side cancellability (24h pre-check)

export interface CancelBookingResult {
  success: boolean;
  data?: any;
  error?: { code?: string; message: string };
}

export interface BookingLike {
  id: string;
  status?: string;
  // flexible datetime fields from API
  startAt?: string | Date;
  startDateTime?: string | Date;
  start?: string | Date;
  start_time?: string | Date;
  start_date?: string | Date;
  start_date_time?: string | Date;
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

export function getBookingStartDate(booking: BookingLike): Date | null {
  return (
    parseDate((booking as any).startAt) ||
    parseDate((booking as any).startDateTime) ||
    parseDate((booking as any).start) ||
    parseDate((booking as any).start_date_time) ||
    parseDate((booking as any).start_time) ||
    parseDate((booking as any).start_date) ||
    null
  );
}

export function isBookingCancellable(booking: BookingLike, now: Date = new Date()): { allowed: boolean; reason?: string } {
  const status = (booking.status || '').toUpperCase();
  // Only active bookings can be cancelled by user
  if (status && status !== 'ATTIVA' && status !== 'ACTIVE') {
    return { allowed: false, reason: 'STATUS_NOT_CANCELLABLE' };
  }
  const start = getBookingStartDate(booking);
  if (!start) return { allowed: false, reason: 'MISSING_START' };
  const diffMs = start.getTime() - now.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  if (hours <= 24) {
    return { allowed: false, reason: 'LESS_THAN_24H' };
  }
  return { allowed: true };
}

export async function cancelBooking(bookingId: string, opts?: { signal?: AbortSignal }): Promise<CancelBookingResult> {
  try {
    const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: opts?.signal,
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = body?.error?.message || body?.message || 'Errore durante la cancellazione della prenotazione';
      return { success: false, error: { code: body?.error?.code, message } };
    }

    return { success: true, data: body?.data ?? body };
  } catch (e: any) {
    return { success: false, error: { message: e?.message || 'Network error' } };
  }
}
