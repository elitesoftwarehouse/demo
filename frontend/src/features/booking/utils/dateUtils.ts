// dateUtils.ts - utilities for booking date picker integration

// Parse a Date into ISO YYYY-MM-DD in local time
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0; // Sunday in JS is 0
}

export function isDateDisabledFactory(disabledIsoSet: Set<string>) {
  return (date: Date): boolean => {
    const iso = toIsoDate(date);
    if (disabledIsoSet.has(iso)) return true;
    // Defensive: block Sundays even if not contained in API response
    if (isSunday(date)) return true;
    return false;
  };
}
