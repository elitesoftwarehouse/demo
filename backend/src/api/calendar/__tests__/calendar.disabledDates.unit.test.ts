import { computeDisabledDates, parseIsoDate, diffDaysInclusive } from '../../../modules/calendar/holiday.service';

// declare jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

describe('holiday.service helpers', () => {
  test('parseIsoDate validates format', () => {
    expect(parseIsoDate('2026-01-01')).toBeInstanceOf(Date);
    expect(parseIsoDate('2026/01/01')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
  });

  test('diffDaysInclusive works for small ranges', () => {
    const a = parseIsoDate('2026-01-01')!;
    const b = parseIsoDate('2026-01-03')!;
    expect(diffDaysInclusive(a, b)).toBe(3);
  });

  test('computeDisabledDates includes Sundays and Easter Monday', () => {
    // 2026 Easter Sunday is 2026-04-05, so Easter Monday is 2026-04-06
    const from = parseIsoDate('2026-04-01')!;
    const to = parseIsoDate('2026-04-10')!;
    const list = computeDisabledDates(from, to);
    expect(list).toEqual(expect.arrayContaining(['2026-04-05', '2026-04-06']));
  });

  test('fixed Italian holidays are included', () => {
    const from = parseIsoDate('2026-12-20')!;
    const to = parseIsoDate('2026-12-31')!;
    const list = computeDisabledDates(from, to);
    expect(list).toEqual(expect.arrayContaining(['2026-12-25', '2026-12-26']));
  });
});
