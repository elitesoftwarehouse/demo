/**
 * Holiday/disabled dates service for calendar range queries.
 * - Computes Sundays, main Italian public holidays, and Easter Monday (Pasquetta)
 * - Returns dates as ISO strings YYYY-MM-DD (UTC, no time)
 */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  return `${y}-${m}-${day}`;
}

function dateFromIsoUTC(iso: string): Date {
  // Expect YYYY-MM-DD, create a date at 00:00:00Z to avoid TZ shifts
  return new Date(`${iso}T00:00:00.000Z`);
}

function addDaysUTC(d: Date, days: number): Date {
  const nd = new Date(d.getTime());
  nd.setUTCDate(nd.getUTCDate() + days);
  return nd;
}

// Anonymous Gregorian algorithm for Easter Sunday
function computeEasterSunday(year: number): Date {
  // Meeus/Jones/Butcher algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  // Construct at UTC midnight
  return new Date(Date.UTC(year, month - 1, day));
}

function fixedHolidayIsoDates(year: number): string[] {
  const mmdd = [
    '01-01', // Capodanno
    '01-06', // Epifania
    '04-25', // Liberazione
    '05-01', // Festa del Lavoro
    '06-02', // Festa della Repubblica
    '08-15', // Ferragosto
    '11-01', // Ognissanti
    '12-08', // Immacolata
    '12-25', // Natale
    '12-26', // Santo Stefano
  ];
  return mmdd.map((md) => `${year}-${md}`);
}

function variableHolidayIsoDates(year: number): string[] {
  const easter = computeEasterSunday(year);
  const easterMonday = addDaysUTC(easter, 1);
  return [formatDateUTC(easterMonday)]; // Pasquetta (Easter Monday)
}

export interface DisabledDatesOptions {
  // future expansion if needed (e.g., include Saturdays)
}

/**
 * Compute disabled dates (YYYY-MM-DD) for the inclusive range [from, to].
 * Includes Sundays, fixed-date Italian public holidays, and Easter Monday.
 */
export function computeDisabledDates(from: Date, to: Date, _opts?: DisabledDatesOptions): string[] {
  if (!(from instanceof Date) || !(to instanceof Date)) return [];
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  if (start.getTime() > end.getTime()) return [];

  // Pre-compute holidays by year covered in the range
  const years = new Set<number>();
  years.add(start.getUTCFullYear());
  years.add(end.getUTCFullYear());
  // If range spans multiple years, collect all
  for (let y = start.getUTCFullYear() + 1; y < end.getUTCFullYear(); y++) years.add(y);

  const holidaySet = new Set<string>();
  for (const y of years) {
    for (const d of fixedHolidayIsoDates(y)) holidaySet.add(d);
    for (const d of variableHolidayIsoDates(y)) holidaySet.add(d);
  }

  const out: string[] = [];
  for (let d = start; d.getTime() <= end.getTime(); d = addDaysUTC(d, 1)) {
    const iso = formatDateUTC(d);
    const isSunday = d.getUTCDay() === 0; // Sunday
    if (isSunday || holidaySet.has(iso)) out.push(iso);
  }
  return out;
}

/** Utility helpers exposed for controller usage */
export function parseIsoDate(input: string): Date | null {
  if (typeof input !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const d = dateFromIsoUTC(input);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function diffDaysInclusive(a: Date, b: Date): number {
  const start = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const end = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  const ms = end - start;
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}
