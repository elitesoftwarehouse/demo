// Date utilities for date-only (YYYY-MM-DD) handling and business day rules

export function toDateOnlyString(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isValidDateOnly(s: string): boolean {
  // Basic YYYY-MM-DD check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00');
  return !Number.isNaN(d.getTime());
}

export function isWorkingDay(dateOnly: string): boolean {
  // Monday=1 ... Sunday=0 using getDay()
  const d = new Date(dateOnly + 'T00:00:00');
  const wd = d.getDay();
  return wd >= 1 && wd <= 5; // Mon-Fri
}

export function startOfDateMs(dateOnly: string): number {
  const d = new Date(dateOnly + 'T00:00:00');
  return d.getTime();
}
