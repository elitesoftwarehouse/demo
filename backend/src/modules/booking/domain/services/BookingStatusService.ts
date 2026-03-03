// BookingStatusService - central logic to compute booking state
// Rules:
// - CANCELLATA* : if cancelledAt is present (truthy). If cancellationSource provided → map to CANCELLATA_DA_UTENTE / CANCELLATA_DA_ADMIN, else CANCELLATA
// - PASSATA: if not cancelled and booking end (date-only) is before "today" in target TZ
// - ATTIVA: otherwise (today or future and not cancelled)
//
// Timezone: default 'Europe/Rome'. Computation is date-only. If your domain adds
// start/end times in the future, adapt the comparison to use end time.

import { BookingState } from '../entities/Booking';

export type CancellationSource = 'USER' | 'ADMIN' | 'SYSTEM' | null | undefined;

export type ComputeStatusInput = {
  // Booking date (date-only). Accepts YYYY-MM-DD string or Date.
  date: string | Date;
  // Cancellation timestamp (any truthy value means cancelled). Accepts ISO string or Date.
  cancelledAt?: string | Date | null;
  // Optional: who cancelled (audit)
  cancellationSource?: CancellationSource;
  // Optional override of current time (useful for tests)
  now?: Date;
  // Target timezone for today calculation
  tz?: string; // default 'Europe/Rome'
};

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function toDateKeyFromDate(d: Date): string {
  // Use UTC to produce a stable YYYY-MM-DD regardless of runtime TZ
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${pad(m)}-${pad(day)}`;
}

function toDateKey(input: string | Date): string {
  if (input instanceof Date) return toDateKeyFromDate(input);
  // Expect YYYY-MM-DD. Fallback: try Date parsing and normalize to YYYY-MM-DD UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (!isNaN(d.getTime())) return toDateKeyFromDate(d);
  throw new Error('Invalid date input for booking');
}

function getTodayKeyInTz(tz: string, now?: Date): string {
  // Use Intl API to format parts in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now ?? new Date());
  const p: Record<string, string> = {};
  for (const part of parts) {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      p[part.type] = part.value;
    }
  }
  return `${p.year}-${p.month}-${p.day}`;
}

function compareDateKeys(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export class BookingStatusService {
  static computeStatus(input: ComputeStatusInput): BookingState {
    const tz = input.tz || 'Europe/Rome';
    const dateKey = toDateKey(input.date);

    // Cancelled wins over anything else
    if (input.cancelledAt) {
      const src = (input.cancellationSource || '').toString().toUpperCase();
      if (src === 'USER') return 'CANCELLATA_DA_UTENTE' as BookingState;
      if (src === 'ADMIN') return 'CANCELLATA_DA_ADMIN' as BookingState;
      return 'CANCELLATA';
    }

    const todayKey = getTodayKeyInTz(tz, input.now);
    // If booking date is before today => PASSATA
    if (compareDateKeys(dateKey, todayKey) < 0) return 'PASSATA';

    // Today or future => ATTIVA
    return 'ATTIVA';
  }

  // Helper to normalize a stored status ensuring it matches current rules.
  static normalizeStoredStatus(stored: BookingState, input: ComputeStatusInput): BookingState {
    const computed = this.computeStatus(input);
    return computed;
  }
}

export function getTodayInEuropeRome(now?: Date): string {
  return getTodayKeyInTz('Europe/Rome', now);
}
