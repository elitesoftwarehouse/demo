// Simple holiday calendar helper
// - Weekends are considered non-working by business logic elsewhere
// - Holidays can be configured via env HOLIDAYS as comma-separated MM-DD values (e.g., "01-01,05-01,12-25")

const DEFAULT_HOLIDAYS = new Set<string>([
  '01-01', // New Year
  '04-25', // Liberation Day (IT)
  '05-01', // Labor Day
  '06-02', // Republic Day (IT)
  '08-15', // Ferragosto
  '11-01', // Ognissanti
  '12-08', // Immacolata
  '12-25', // Natale
  '12-26', // Santo Stefano
]);

let configuredHolidays: Set<string> | null = null;

function loadConfiguredHolidays(): Set<string> {
  if (configuredHolidays) return configuredHolidays;
  const raw = process.env.HOLIDAYS || '';
  const set = new Set<string>();
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((mmdd) => set.add(mmdd));
  configuredHolidays = set.size > 0 ? set : DEFAULT_HOLIDAYS;
  return configuredHolidays;
}

/**
 * Check if a date (YYYY-MM-DD) is a configured holiday (ignores year)
 */
export function isHoliday(dateStr: string): boolean {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const mmdd = `${parts[1]}-${parts[2]}`;
  const holidays = loadConfiguredHolidays();
  return holidays.has(mmdd);
}
