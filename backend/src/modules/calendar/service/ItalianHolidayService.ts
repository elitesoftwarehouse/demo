// ItalianHolidayService - compute disabled dates (Sundays + main Italian holidays + Easter Monday)
// NOTE: Dates are handled in UTC to avoid timezone issues.

export class ItalianHolidayService {
  // Returns a list of ISO date strings (YYYY-MM-DD) between from and to inclusive
  // Disabled dates include: all Sundays, fixed-date Italian holidays, and Easter Monday (Pasquetta)
  calculateDisabledDates(from: Date, to: Date): string[] {
    if (to.getTime() < from.getTime()) return [];

    const result: string[] = [];
    const holidayCache: Map<number, Set<string>> = new Map(); // year -> set of YYYY-MM-DD

    let cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

    while (cur.getTime() <= end.getTime()) {
      const y = cur.getUTCFullYear();
      let holidays = holidayCache.get(y);
      if (!holidays) {
        holidays = this.buildHolidaysForYear(y);
        holidayCache.set(y, holidays);
      }

      const isSunday = cur.getUTCDay() === 0; // Sunday
      const iso = toIsoDate(cur);
      if (isSunday || holidays.has(iso)) {
        result.push(iso);
      }

      // advance 1 day UTC
      cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
    }

    return result;
  }

  private buildHolidaysForYear(year: number): Set<string> {
    const s = new Set<string>();

    // Fixed-date holidays
    const fixed: Array<[number, number]> = [
      [1, 1],   // Capodanno
      [1, 6],   // Epifania
      [4, 25],  // Liberazione
      [5, 1],   // Festa dei Lavoratori
      [6, 2],   // Festa della Repubblica
      [8, 15],  // Ferragosto
      [11, 1],  // Ognissanti
      [12, 8],  // Immacolata Concezione
      [12, 25], // Natale
      [12, 26], // Santo Stefano
    ];
    for (const [m, d] of fixed) {
      s.add(dateIso(year, m, d));
    }

    // Easter Monday (Pasquetta) - compute Easter Sunday then +1 day
    const easterSunday = this.computeEasterSunday(year);
    const easterMonday = new Date(easterSunday.getTime() + 24 * 60 * 60 * 1000);
    s.add(toIsoDate(easterMonday));

    return s;
  }

  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher) to compute Easter Sunday
  private computeEasterSunday(year: number): Date {
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
    // Convert to UTC date
    return new Date(Date.UTC(year, month - 1, day));
  }
}

function pad(n: number): string { return n < 10 ? `0${n}` : String(n); }
function dateIso(y: number, m: number, d: number): string { return `${y}-${pad(m)}-${pad(d)}`; }
function toIsoDate(dt: Date): string { return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`; }
