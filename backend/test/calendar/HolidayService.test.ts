import { HolidayService } from '../../src/modules/calendar/service/HolidayService';

function toDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

describe('HolidayService', () => {
  it('computes Easter and Easter Monday correctly for sample years', () => {
    const svc = new HolidayService();
    // Known dates (Western Easter):
    // 2024-03-31 (Sun) -> Pasquetta 2024-04-01
    // 2025-04-20 (Sun) -> Pasquetta 2025-04-21
    // 2026-04-05 (Sun) -> Pasquetta 2026-04-06
    const em2024 = svc.getEasterMonday(2024);
    expect(em2024).toEqual({ month: 4, day: 1 });
    const em2025 = svc.getEasterMonday(2025);
    expect(em2025).toEqual({ month: 4, day: 21 });
    const em2026 = svc.getEasterMonday(2026);
    expect(em2026).toEqual({ month: 4, day: 6 });
  });

  it('isHoliday includes fixed holidays and Easter Monday', () => {
    const svc = new HolidayService();
    expect(svc.isHoliday('2026-01-01')).toBe(true);
    expect(svc.isHoliday('2026-12-25')).toBe(true);
    // Pasquetta 2026-04-06
    expect(svc.isHoliday('2026-04-06')).toBe(true);
    // A regular day
    expect(svc.isHoliday('2026-04-07')).toBe(false);
  });

  it('isBlocked returns true for Sundays', () => {
    const svc = new HolidayService();
    // 2026-01-04 is a Sunday
    expect(svc.isBlocked('2026-01-04')).toBe(true);
    // 2026-01-05 is Monday (not a holiday)
    expect(svc.isBlocked('2026-01-05')).toBe(false);
  });

  it('getDisabledDates returns all Sundays and holidays in a range', () => {
    const svc = new HolidayService();
    const dates = svc.getDisabledDates('2026-04-01', '2026-04-10');
    // In this range we expect Easter Monday 2026-04-06 and Sundays 2026-04-05
    expect(dates).toContain('2026-04-05'); // Sunday
    expect(dates).toContain('2026-04-06'); // Pasquetta
  });

  it('supports local closures from injected configuration', () => {
    const svc = new HolidayService({ closures: [
      { isRecurring: true, month: 12, day: 24 },
      { isRecurring: false, date: '2026-02-29' },
      { isRecurring: false, date: '2025-12-31', enabled: false },
    ]});

    expect(svc.isHoliday('2026-12-24')).toBe(true);
    expect(svc.isHoliday('2026-02-29')).toBe(true);
    // Disabled closure should not appear
    expect(svc.isHoliday('2025-12-31')).toBe(false);
    // Not recurring date should not match other years
    expect(svc.isHoliday('2027-02-29')).toBe(false);
  });

  it('getDisabledDates works regardless of input order', () => {
    const svc = new HolidayService();
    const a = svc.getDisabledDates('2026-04-10', '2026-04-01');
    const b = svc.getDisabledDates('2026-04-01', '2026-04-10');
    expect(a).toEqual(b);
  });
});
