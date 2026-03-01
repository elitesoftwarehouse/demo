// BookingStateService — centralized logic to derive booking state
// Rules
// - CANCELLATA: explicit state or cancellation action wins over time rules
// - PASSATA: not cancelled AND booking end < now (in Europe/Rome by default)
// - ATTIVA: otherwise
//
// Notes
// - Our schema models day-based bookings with optional timeSlot (string).
// - For full-day bookings we consider end-of-day local time (23:59).
// - For timeSlot we try to parse common formats like '09-13', '09:00-13:00', 'AM', 'PM', 'ALL'.
// - Client-provided state must be ignored; use these helpers to compute/normalize.

import type { Booking, BookingState } from '../../entities/Booking';

export type ComputeOptions = {
  now?: Date; // default new Date()
  timeZone?: string; // default 'Europe/Rome'
};

const DEFAULT_TZ = 'Europe/Rome';

// Utilities to work with local dates/times in a time zone without external deps
function getLocalDateParts(d: Date, timeZone: string): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const map: any = {};
  for (const p of parts) map[p.type] = p.value;
  return { y: Number(map.year), m: Number(map.month), day: Number(map.day) };
}

function getLocalHm(d: Date, timeZone: string): { h: number; min: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d);
  const map: any = {};
  for (const p of parts) map[p.type] = p.value;
  return { h: Number(map.hour), min: Number(map.minute) };
}

function toIsoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayIsoInTz(now: Date, tz: string): string {
  const { y, m, day } = getLocalDateParts(now, tz);
  return toIsoDate(y, m, day);
}

// Parse a timeSlot string into start/end minutes-of-day
// Supported patterns:
// - 'HH-HH' e.g., '09-13' -> [540, 780]
// - 'HH:MM-HH:MM' e.g., '09:30-13:00'
// - 'AM' -> [8:00, 13:00) (heuristic)
// - 'PM' -> [13:00, 18:00) (heuristic)
// - 'ALL' | 'FULL' -> [0:00, 24:00)
// Unknown/invalid -> null (caller will fallback to full day)
function parseTimeSlot(slot?: string | null): { startMin: number; endMin: number } | null {
  if (!slot) return null;
  const s = String(slot).trim().toUpperCase();
  if (!s) return null;
  if (s === 'ALL' || s === 'FULL' || s === 'GIORNO' || s === 'DAY') return { startMin: 0, endMin: 24 * 60 };
  if (s === 'AM') return { startMin: 8 * 60, endMin: 13 * 60 };
  if (s === 'PM') return { startMin: 13 * 60, endMin: 18 * 60 };
  // HH-HH
  let m = s.match(/^([01]?\d|2[0-3])\s?-\s?([01]?\d|2[0-3])$/);
  if (m) {
    const h1 = Number(m[1]);
    const h2 = Number(m[2]);
    return { startMin: h1 * 60, endMin: h2 * 60 };
  }
  // HH:MM-HH:MM
  m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)\s?-\s?([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m) {
    const h1 = Number(m[1]);
    const min1 = Number(m[2]);
    const h2 = Number(m[3]);
    const min2 = Number(m[4]);
    return { startMin: h1 * 60 + min1, endMin: h2 * 60 + min2 };
  }
  return null;
}

export function shouldBePassata(
  dateIso: string,
  timeSlot?: string | null,
  options?: ComputeOptions
): boolean {
  const now = options?.now ?? new Date();
  const tz = options?.timeZone || DEFAULT_TZ;
  const todayIso = todayIsoInTz(now, tz);
  if (dateIso < todayIso) return true; // entire day in the past
  if (dateIso > todayIso) return false; // future day

  // Same day: compare end time vs now
  const hm = getLocalHm(now, tz);
  const nowMin = hm.h * 60 + hm.min;
  const parsed = parseTimeSlot(timeSlot);
  const endMin = parsed ? parsed.endMin : 24 * 60; // end-of-day for full-day
  return nowMin >= endMin; // if reached/passed end, it's past
}

export function computeStateFor(
  booking: Pick<Booking, 'date' | 'timeSlot' | 'state'>,
  options?: ComputeOptions
): BookingState {
  // Cancellation is authoritative
  if (booking.state === 'CANCELLATA') return 'CANCELLATA';
  return shouldBePassata(booking.date, booking.timeSlot ?? null, options) ? 'PASSATA' : 'ATTIVA';
}

export function normalizeBookingState<T extends Booking>(
  booking: T,
  options?: ComputeOptions
): T {
  const computed = computeStateFor(booking, options);
  if (computed === booking.state) return booking;
  // return a shallow copy with normalized state (do not mutate original instance defensively)
  return { ...booking, state: computed };
}

// Helper to decide state at creation without trusting client payload
export function initialStateForCreation(
  dateIso: string,
  timeSlot?: string | null,
  options?: ComputeOptions
): BookingState {
  return shouldBePassata(dateIso, timeSlot, options) ? 'PASSATA' : 'ATTIVA';
}

// Sanitize client payloads: ignore any provided state
export function stripStateFromCreatePayload<T extends { state?: any }>(payload: T): Omit<T, 'state'> {
  const { state: _ignored, ...rest } = payload as any;
  return rest;
}
