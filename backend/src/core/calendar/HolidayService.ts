// HolidayService — compute closed days (Sundays + Italian national holidays + Easter Monday)
// Pure domain/service code, UI-agnostic. Time-zone aware (default: Europe/Rome).

export type ClosedDate = {
  date: string; // ISO (YYYY-MM-DD)
  code: string; // machine code
  name: string; // human readable (IT)
};

export type ExtraOneOff = {
  date: string; // ISO YYYY-MM-DD
  code?: string;
  name?: string;
  active?: boolean;
};

export type ExtraRecurring = {
  month: number; // 1-12
  day: number; // 1-31
  code?: string;
  name?: string;
  active?: boolean;
};

export type HolidayOptions = {
  timeZone?: string; // default 'Europe/Rome'
  // When false, service can still list dates but callers may choose to not block. Here informational only.
  strictMode?: boolean; // default true
  // Optional extra closures (e.g., local patron saint or one-off closures)
  extraOneOff?: ExtraOneOff[];
  extraRecurring?: ExtraRecurring[];
};

export class HolidayService {
  private readonly tz: string;
  private readonly strict: boolean;
  private readonly extraOneOff: ExtraOneOff[];
  private readonly extraRecurring: ExtraRecurring[];

  // cache yearly fixed holidays including Easter Monday and recurring extras
  private yearCache: Map<number, ClosedDate[]> = new Map();

  constructor(options?: HolidayOptions) {
    this.tz = options?.timeZone || 'Europe/Rome';
    this.strict = options?.strictMode !== false; // default true
    this.extraOneOff = (options?.extraOneOff || []).filter((e) => e.active !== false);
    this.extraRecurring = (options?.extraRecurring || []).filter((e) => e.active !== false);
  }

  // Public API: check if a date is closed
  isClosed(date: Date | string): { closed: boolean; code?: string; name?: string } {
    const ymd = this.getYmdInTz(date);
    const reason = this.getClosureReason(ymd);
    if (reason) return { closed: true, code: reason.code, name: reason.name };
    // Sundays
    if (this.getWeekday(ymd) === 0) return { closed: true, code: 'SUNDAY', name: 'Domenica' };
    return { closed: false };
  }

  // Public API: list closed dates for a full year (excluding Sundays)
  listClosedDates(year: number): ClosedDate[] {
    return this.getYearlyClosures(year);
  }

  // Public API: get disabled dates between from..to inclusive (includes Sundays)
  getDisabledDates(from: Date | string, to: Date | string): ClosedDate[] {
    const start = this.getYmdInTz(from);
    const end = this.getYmdInTz(to);
    if (this.compareYmd(start, end) > 0) return [];

    // Collect base closures for involved years
    const years = new Set<number>();
    for (let y = start.y; y <= end.y; y++) years.add(y);
    const baseByDate = new Map<string, ClosedDate>();
    years.forEach((y) => {
      for (const cd of this.getYearlyClosures(y)) {
        if (!baseByDate.has(cd.date)) baseByDate.set(cd.date, cd);
      }
    });

    // Iterate range and add Sundays + base closures only if in range
    const result: ClosedDate[] = [];
    let cur = start;
    while (this.compareYmd(cur, end) <= 0) {
      const iso = this.toIso(cur);
      const base = baseByDate.get(iso);
      if (base) result.push(base);
      if (!base && this.getWeekday(cur) === 0) {
        result.push({ date: iso, code: 'SUNDAY', name: 'Domenica' });
      }
      cur = this.addDays(cur, 1);
    }

    // One-off extras inside range (they may overlap; keep explicit over computed)
    for (const ex of this.extraOneOff) {
      const ymd = this.parseIsoDate(ex.date);
      if (!ymd) continue;
      if (this.compareYmd(start, ymd) <= 0 && this.compareYmd(ymd, end) <= 0) {
        const iso = this.toIso(ymd);
        // If already present (e.g., fixed holiday on Sunday), prefer explicit extra (override)
        const idx = result.findIndex((r) => r.date === iso);
        const item: ClosedDate = {
          date: iso,
          code: ex.code || 'EXTRA',
          name: ex.name || 'Chiuso',
        };
        if (idx >= 0) result[idx] = item;
        else result.push(item);
      }
    }

    // Sort ascending by date
    result.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return result;
  }

  // Internals
  private getYearlyClosures(year: number): ClosedDate[] {
    if (this.yearCache.has(year)) return this.yearCache.get(year)!;

    const items: ClosedDate[] = [];

    // Fixed national holidays (Italy)
    const fixed: Array<{ m: number; d: number; code: string; name: string }> = [
      { m: 1, d: 1, code: 'NEW_YEAR', name: 'Capodanno' },
      { m: 1, d: 6, code: 'EPIPHANY', name: 'Epifania' },
      { m: 4, d: 25, code: 'LIBERATION_DAY', name: 'Anniversario della Liberazione' },
      { m: 5, d: 1, code: 'LABOUR_DAY', name: 'Festa del Lavoro' },
      { m: 6, d: 2, code: 'REPUBLIC_DAY', name: 'Festa della Repubblica' },
      { m: 8, d: 15, code: 'ASSUMPTION', name: 'Ferragosto (Assunzione)' },
      { m: 11, d: 1, code: 'ALL_SAINTS', name: 'Ognissanti' },
      { m: 12, d: 8, code: 'IMMACULATE', name: 'Immacolata Concezione' },
      { m: 12, d: 25, code: 'CHRISTMAS', name: 'Natale' },
      { m: 12, d: 26, code: 'STEPHEN', name: 'Santo Stefano' },
    ];

    for (const f of fixed) {
      items.push({ date: this.toIso({ y: year, m: f.m, d: f.d }), code: f.code, name: f.name });
    }

    // Easter Monday (Pasquetta) — Monday after Easter Sunday
    const easter = this.computeEasterSunday(year);
    const pasquetta = this.addDays(easter, 1);
    items.push({ date: this.toIso(pasquetta), code: 'EASTER_MONDAY', name: "Lunedì dell'Angelo (Pasquetta)" });

    // Extra recurring closures
    for (const r of this.extraRecurring) {
      if (!r || !Number.isFinite(r.month) || !Number.isFinite(r.day)) continue;
      const date = this.toIso({ y: year, m: clampInt(r.month, 1, 12), d: clampInt(r.day, 1, 31) });
      items.push({ date, code: r.code || 'EXTRA_RECURRING', name: r.name || 'Chiuso' });
    }

    // One-off extras for this year
    for (const ex of this.extraOneOff) {
      const ymd = this.parseIsoDate(ex.date);
      if (ymd && ymd.y === year) {
        items.push({ date: this.toIso(ymd), code: ex.code || 'EXTRA', name: ex.name || 'Chiuso' });
      }
    }

    // Deduplicate by date (prefer last added, i.e., extras override)
    const byDate = new Map<string, ClosedDate>();
    for (const it of items) byDate.set(it.date, it);
    const finalItems = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    this.yearCache.set(year, finalItems);
    return finalItems;
  }

  private getClosureReason(ymd: YMD): ClosedDate | null {
    const yearItems = this.getYearlyClosures(ymd.y);
    const iso = this.toIso(ymd);
    const found = yearItems.find((i) => i.date === iso);
    return found || null;
  }

  // Gregorian computus (Meeus/Jones/Butcher) to get Easter Sunday date (YMD)
  private computeEasterSunday(year: number): YMD {
    // Source: https://en.wikipedia.org/wiki/Date_of_Easter#Anonymous_Gregorian_algorithm
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
    return { y: year, m: month, d: day };
  }

  // Utilities working with date-only arithmetic (UTC-based to avoid TZ issues)
  private getYmdInTz(input: Date | string): YMD {
    if (input instanceof Date) return this.getYmdFromDateInTz(input);
    // assume ISO-like or yyyy-mm-dd; new Date parsing can be unsafe; use manual if only date
    const ymd = this.parseIsoDate(input);
    if (ymd) return ymd;
    // fallback: parse via Date then extract parts in TZ
    const d = new Date(input);
    if (!Number.isFinite(d.getTime())) throw new Error(`Invalid date input: ${input}`);
    return this.getYmdFromDateInTz(d);
  }

  private getYmdFromDateInTz(d: Date): YMD {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: this.tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = fmt.formatToParts(d);
    const y = Number(parts.find((p) => p.type === 'year')?.value);
    const m = Number(parts.find((p) => p.type === 'month')?.value);
    const da = Number(parts.find((p) => p.type === 'day')?.value);
    return { y, m, d: da };
  }

  private parseIsoDate(s: string | undefined | null): YMD | null {
    if (!s) return null;
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    return { y, m: mo, d };
  }

  private toIso(ymd: YMD): string {
    const m = String(ymd.m).padStart(2, '0');
    const d = String(ymd.d).padStart(2, '0');
    return `${ymd.y}-${m}-${d}`;
    }

  private compareYmd(a: YMD, b: YMD): number {
    if (a.y !== b.y) return a.y - b.y;
    if (a.m !== b.m) return a.m - b.m;
    return a.d - b.d;
  }

  private addDays(ymd: YMD, days: number): YMD {
    const dt = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }

  private getWeekday(ymd: YMD): number {
    // 0=Sunday .. 6=Saturday, invariant for a given calendar date
    return new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay();
  }
}

// Helpers
function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
