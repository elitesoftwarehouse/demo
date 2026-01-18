// ClosureService - domain logic to determine coworking closed days
// Provides isGiornoChiuso(date: Date) and utilities to load closures
// This implementation uses a repository interface to query configured closures

export type ClosureType = 'SINGLE' | 'WEEKLY' | 'ANNUAL';

export interface CoworkingClosure {
  id: string;
  type: ClosureType;
  date?: string | Date | null; // for SINGLE
  weekday?: number | null; // 0=Sun..6=Sat for WEEKLY
  month?: number | null; // 1..12 for ANNUAL
  monthDay?: number | null; // 1..31 for ANNUAL
  reason?: string | null;
  active: boolean;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

export interface IClosureRepository {
  // Return active closures possibly filtered by date for optimization
  findActiveClosures(at?: Date): Promise<CoworkingClosure[]>;
}

export class ClosureService {
  constructor(private readonly repo: IClosureRepository) {}

  async isGiornoChiuso(date: Date): Promise<{ closed: boolean; reason?: string }> {
    const closures = await this.repo.findActiveClosures(date);
    const d = new Date(date);
    const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const weekday = day.getUTCDay(); // 0..6
    const y = day.getUTCFullYear();
    const m = day.getUTCMonth() + 1; // 1..12
    const md = day.getUTCDate();

    for (const c of closures) {
      if (!c.active) continue;
      // optional activation window
      if (c.startDate) {
        const sd = toUTCDate(c.startDate);
        if (day < sd) continue;
      }
      if (c.endDate) {
        const ed = toUTCDate(c.endDate);
        if (day > ed) continue;
      }

      if (c.type === 'SINGLE') {
        if (!c.date) continue;
        const cd = toUTCDate(c.date);
        if (sameDay(cd, day)) return { closed: true, reason: c.reason || undefined };
      } else if (c.type === 'WEEKLY') {
        if (typeof c.weekday === 'number' && c.weekday === weekday) {
          return { closed: true, reason: c.reason || undefined };
        }
      } else if (c.type === 'ANNUAL') {
        if (typeof c.month === 'number' && typeof c.monthDay === 'number') {
          if (c.month === m && c.monthDay === md) {
            return { closed: true, reason: c.reason || undefined };
          }
        }
      }
    }
    return { closed: false };
  }
}

function sameDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function toUTCDate(input: string | Date): Date {
  const d = typeof input === 'string' ? new Date(input) : new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
