// HolidaysService - calcolo e verifica festività italiane/chiusure
// Nota: implementazione focalizzata su calcolo date bloccate per anno corrente e successivo.
// Le date sono rappresentate come YYYY-MM-DD (timezone Europe/Rome) e comprendono:
// - Domeniche
// - Pasquetta (giorno successivo alla Pasqua calcolata con algoritmo gregoriano)
// - Festività nazionali fisse
// - Eventuali extra/deroghe da configurazione

export interface HolidaysConfig {
  fixedHolidaysEnabled?: boolean; // default true
  sundaysEnabled?: boolean; // default true
  allowOpenOnNationalHoliday?: boolean; // default false
  extraClosedDates?: string[]; // YYYY-MM-DD
  exceptionalOpenDates?: string[]; // YYYY-MM-DD
}

export class HolidaysService {
  private readonly cfg: Required<HolidaysConfig>;
  private cache = new Map<number, Set<string>>();

  constructor(cfg?: HolidaysConfig) {
    this.cfg = {
      fixedHolidaysEnabled: cfg?.fixedHolidaysEnabled ?? true,
      sundaysEnabled: cfg?.sundaysEnabled ?? true,
      allowOpenOnNationalHoliday: cfg?.allowOpenOnNationalHoliday ?? false,
      extraClosedDates: cfg?.extraClosedDates ?? [],
      exceptionalOpenDates: cfg?.exceptionalOpenDates ?? [],
    };
  }

  // Ritorna l'elenco normalizzato delle date chiuse per un dato anno
  getClosedDates(year: number): string[] {
    if (!Number.isFinite(year) || year < 1970 || year > 2100) return [];
    if (!this.cache.has(year)) {
      const set = new Set<string>();

      // Festività nazionali a data fissa (sempre chiuse)
      if (this.cfg.fixedHolidaysEnabled && !this.cfg.allowOpenOnNationalHoliday) {
        for (const [m, d] of FIXED_HOLIDAYS) {
          set.add(fmt(year, m, d));
        }
      }

      // Pasquetta
      const easter = computeEasterDate(year);
      const easterMonday = addDays(easter, 1);
      set.add(dateToYMD(easterMonday));

      // Domeniche
      if (this.cfg.sundaysEnabled) {
        for (const ymd of allSundaysOfYear(year)) {
          set.add(ymd);
        }
      }

      // Extra chiusure
      for (const ymd of this.cfg.extraClosedDates) {
        if (isYMDInYear(ymd, year)) set.add(ymd);
      }

      // Eccezioni apertura: rimuove dal set
      for (const ymd of this.cfg.exceptionalOpenDates) {
        if (isYMDInYear(ymd, year)) set.delete(ymd);
      }

      this.cache.set(year, set);
    }
    return Array.from(this.cache.get(year)!).sort();
  }

  // Verifica se una data (string o Date) è chiusa
  isDateClosed(date: string | Date): boolean {
    const ymd = typeof date === 'string' ? normalizeYMD(date) : dateToYMD(date);
    const y = parseInt(ymd.slice(0, 4), 10);
    return this.getClosedDates(y).includes(ymd);
  }

  // Lista date chiuse in un intervallo inclusivo [start, end]
  listClosedDates(rangeStart: string, rangeEnd: string): string[] {
    const start = normalizeYMD(rangeStart);
    const end = normalizeYMD(rangeEnd);
    if (start > end) return [];

    const ys = parseInt(start.slice(0, 4), 10);
    const ye = parseInt(end.slice(0, 4), 10);
    const out: string[] = [];
    for (let y = ys; y <= ye; y++) {
      for (const d of this.getClosedDates(y)) {
        if (d >= start && d <= end) out.push(d);
      }
    }
    return out;
  }
}

// Festività nazionali a data fissa (mese, giorno)
const FIXED_HOLIDAYS: Array<[number, number]> = [
  [1, 1],   // Capodanno
  [1, 6],   // Epifania
  [4, 25],  // Liberazione
  [5, 1],   // Lavoro
  [6, 2],   // Repubblica
  [8, 15],  // Ferragosto
  [11, 1],  // Ognissanti
  [12, 8],  // Immacolata
  [12, 25], // Natale
  [12, 26], // Santo Stefano
];

function fmt(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function normalizeYMD(ymd: string): string {
  // assume input come YYYY-MM-DD; non si gestiscono offset/ora
  const [y, m, d] = ymd.split('-');
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function isYMDInYear(ymd: string, year: number): boolean {
  return ymd.startsWith(String(year) + '-');
}

function dateToYMD(dt: Date): string {
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const d = dt.getDate();
  return fmt(y, m, d);
}

function addDays(dt: Date, days: number): Date {
  const copy = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() + days);
  return new Date(copy.getUTCFullYear(), copy.getUTCMonth(), copy.getUTCDate());
}

// Anonymous Gregorian algorithm per Pasqua (rito occidentale)
function computeEasterDate(year: number): Date {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Marzo, 4=Aprile
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  // Ritorna data locale (senza ora); per stabilità usiamo UTC in calcolo e poi costruiamo con Y/M/D
  return new Date(year, month - 1, day);
}

function allSundaysOfYear(year: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, 0, 1);
  // Trova la prima domenica
  while (d.getDay() !== 0) {
    d.setDate(d.getDate() + 1);
  }
  while (d.getFullYear() === year) {
    dates.push(dateToYMD(d));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}
