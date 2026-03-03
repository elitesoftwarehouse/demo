// HolidayService - domain component to calculate Italian holidays and disabled dates
// - Provides calculation for Sundays, fixed national holidays, and Easter Monday (Pasquetta)
// - Supports optional local closures from configuration (JSON) with recurring/non-recurring rules
// - Works with date-only semantics, independent from UI logic

export type LocalClosure = {
  // If isRecurring=true -> apply every year at (month, day)
  isRecurring?: boolean;
  day?: number; // 1-31
  month?: number; // 1-12
  // If not recurring -> specific date in format YYYY-MM-DD
  date?: string;
  name?: string;
  enabled?: boolean; // default true
};

export type HolidayServiceOptions = {
  timezone?: string; // informational, computation is date-only and timezone-agnostic
  configPath?: string; // path to JSON array of LocalClosure
  closures?: LocalClosure[]; // direct injection, useful for tests
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Compute day of week using Tomohiko Sakamoto algorithm (0=Sunday..6=Saturday)
function dayOfWeek(y: number, m: number, d: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (m < 3) y -= 1;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7;
}

function parseDateInput(input: Date | string): { y: number; m: number; d: number; key: string } {
  if (input instanceof Date) {
    const y = input.getFullYear();
    const m = input.getMonth() + 1;
    const d = input.getDate();
    return { y, m, d, key: toDateKey(y, m, d) };
  }
  // Expect 'YYYY-MM-DD'
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m1) throw new Error('Invalid date format, expected YYYY-MM-DD');
  const y = parseInt(m1[1], 10);
  const m = parseInt(m1[2], 10);
  const d = parseInt(m1[3], 10);
  return { y, m, d, key: toDateKey(y, m, d) };
}

export class HolidayService {
  private readonly timezone: string;
  private readonly configPath?: string;
  private closuresCache: LocalClosure[] | null = null;
  private injectedClosures?: LocalClosure[];

  constructor(options?: HolidayServiceOptions) {
    this.timezone = options?.timezone || 'Europe/Rome';
    this.configPath = options?.configPath || process.env.HOLIDAYS_CONFIG_PATH || 'config/holidays.json';
    this.injectedClosures = options?.closures;
  }

  // Fixed Italian holidays (month, day)
  private fixedHolidaysMD(): Array<[number, number]> {
    return [
      [1, 1],   // Capodanno
      [1, 6],   // Epifania
      [4, 25],  // Festa della Liberazione
      [5, 1],   // Festa del Lavoro
      [6, 2],   // Festa della Repubblica
      [8, 15],  // Ferragosto
      [11, 1],  // Ognissanti
      [12, 8],  // Immacolata Concezione
      [12, 25], // Natale
      [12, 26], // Santo Stefano
    ];
  }

  // Public: check if given date is a holiday (fixed or Easter Monday) NOT including Sundays.
  // Use isBlocked for full rule (holidays + Sundays)
  isHoliday(input: Date | string): boolean {
    const { y, key } = parseDateInput(input);
    const set = this.getHolidaySetForYears([y]);
    return set.has(key);
  }

  // Public: check if date is blocked (holiday OR Sunday)
  isBlocked(input: Date | string): boolean {
    const { y, m, d, key } = parseDateInput(input);
    if (this.isSundayFromParts(y, m, d)) return true;
    const set = this.getHolidaySetForYears([y]);
    return set.has(key);
  }

  // Public: list of disabled date strings (YYYY-MM-DD) in inclusive range
  getDisabledDates(from: Date | string, to: Date | string): string[] {
    const a = parseDateInput(from);
    const b = parseDateInput(to);

    // Ensure a <= b
    let y1 = a.y, m1 = a.m, d1 = a.d;
    let y2 = b.y, m2 = b.m, d2 = b.d;
    const startKey = toDateKey(y1, m1, d1);
    const endKey = toDateKey(y2, m2, d2);
    let swap = false;
    if (startKey > endKey) {
      swap = true;
      y1 = b.y; m1 = b.m; d1 = b.d;
      y2 = a.y; m2 = a.m; d2 = a.d;
    }

    const years: number[] = [];
    for (let y = y1; y <= y2; y++) years.push(y);
    const holidaySet = this.getHolidaySetForYears(years);

    // iterate day by day
    const out: string[] = [];
    let cy = y1, cm = m1, cd = d1;
    while (true) {
      const key = toDateKey(cy, cm, cd);
      if (holidaySet.has(key) || this.isSundayFromParts(cy, cm, cd)) {
        out.push(key);
      }
      if (cy === y2 && cm === m2 && cd === d2) break;
      ({ y: cy, m: cm, d: cd } = this.nextDay(cy, cm, cd));
    }

    return out;
  }

  // Return set of YYYY-MM-DD for given years (holidays only, no Sundays)
  private getHolidaySetForYears(years: number[]): Set<string> {
    const set = new Set<string>();
    for (const y of years) {
      for (const [m, d] of this.fixedHolidaysMD()) {
        set.add(toDateKey(y, m, d));
      }
      // Easter Monday
      const em = this.getEasterMonday(y);
      set.add(toDateKey(y, em.month, em.day));
      // Local closures
      for (const key of this.getLocalClosuresForYear(y)) {
        set.add(key);
      }
    }
    return set;
  }

  // Compute next day for civil calendar
  private nextDay(y: number, m: number, d: number): { y: number; m: number; d: number } {
    const dim = this.daysInMonth(y, m);
    if (d < dim) return { y, m, d: d + 1 };
    if (m < 12) return { y, m: m + 1, d: 1 };
    return { y: y + 1, m: 1, d: 1 };
  }

  private isLeap(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  }

  private daysInMonth(y: number, m: number): number {
    return [0, 31, this.isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
  }

  private isSundayFromParts(y: number, m: number, d: number): boolean {
    return dayOfWeek(y, m, d) === 0;
  }

  // Easter (Western, Gregorian) using Meeus/Jones/Butcher algorithm
  // Returns month (3=March, 4=April) and day
  getEaster(year: number): { month: number; day: number } {
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
    return { month, day };
  }

  // Easter Monday = Easter + 1 day
  getEasterMonday(year: number): { month: number; day: number } {
    const e = this.getEaster(year);
    const dim = this.daysInMonth(year, e.month);
    if (e.day < dim) return { month: e.month, day: e.day + 1 };
    // roll over to next month (always March->April)
    return { month: e.month + 1, day: 1 };
  }

  // Local closures loader (cached)
  private loadClosures(): LocalClosure[] {
    if (this.injectedClosures) return this.injectedClosures;
    if (this.closuresCache) return this.closuresCache;

    try {
      // dynamic import of fs only when needed to keep environment flexible
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      if (this.configPath && fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          this.closuresCache = data as LocalClosure[];
          return this.closuresCache;
        }
      }
    } catch {
      // ignore config errors; service remains functional with base rules
    }

    this.closuresCache = [];
    return this.closuresCache;
  }

  private getLocalClosuresForYear(year: number): Set<string> {
    const items = this.loadClosures();
    const set = new Set<string>();
    for (const it of items) {
      if (it && it.enabled === false) continue;
      if (it.isRecurring) {
        if (typeof it.month === 'number' && typeof it.day === 'number') {
          set.add(toDateKey(year, it.month, it.day));
        }
      } else if (it.date) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(it.date);
        if (!m) continue;
        const y = parseInt(m[1], 10);
        if (y === year) set.add(it.date);
      }
    }
    return set;
  }
}
