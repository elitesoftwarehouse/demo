import { ClosureService, type IClosureRepository, type CoworkingClosure } from '../../../../src/modules/calendar/service/ClosureService';

class FakeClosureRepo implements IClosureRepository {
  private closures: CoworkingClosure[] = [];
  constructor(items?: CoworkingClosure[]) {
    if (items) this.closures = items;
  }
  set(items: CoworkingClosure[]) {
    this.closures = items;
  }
  async findActiveClosures(): Promise<CoworkingClosure[]> {
    return this.closures.filter((c) => c.active !== false);
  }
}

function dUTC(y: number, m: number, d: number): Date {
  // m: 1..12
  return new Date(Date.UTC(y, m - 1, d));
}

describe('ClosureService - isGiornoChiuso', () => {
  it('returns closed=false for normal open day (no closures configured)', async () => {
    const repo = new FakeClosureRepo([]);
    const svc = new ClosureService(repo);
    const res = await svc.isGiornoChiuso(dUTC(2026, 1, 15));
    expect(res.closed).toBe(false);
    expect(res.reason).toBeUndefined();
  });

  it('returns closed=true for SINGLE date marked as closed', async () => {
    const repo = new FakeClosureRepo([
      { id: 'c1', type: 'SINGLE', date: '2026-02-10', reason: 'manutenzione', active: true },
    ]);
    const svc = new ClosureService(repo);

    const open = await svc.isGiornoChiuso(dUTC(2026, 2, 9));
    expect(open.closed).toBe(false);

    const closed = await svc.isGiornoChiuso(dUTC(2026, 2, 10));
    expect(closed.closed).toBe(true);
    expect(closed.reason).toBe('manutenzione');
  });

  it('supports WEEKLY recurring closure (e.g., Sunday)', async () => {
    // 0 = Sunday, per service comment
    const repo = new FakeClosureRepo([
      { id: 'w1', type: 'WEEKLY', weekday: 0, reason: 'chiuso la domenica', active: true },
    ]);
    const svc = new ClosureService(repo);

    // 2026-03-01 is a Sunday (UTC)
    const sunday = await svc.isGiornoChiuso(dUTC(2026, 3, 1));
    expect(sunday.closed).toBe(true);

    // 2026-03-03 is a Tuesday
    const tuesday = await svc.isGiornoChiuso(dUTC(2026, 3, 3));
    expect(tuesday.closed).toBe(false);
  });

  it('supports ANNUAL recurring closure (e.g., 15 August - Ferragosto)', async () => {
    const repo = new FakeClosureRepo([
      { id: 'a1', type: 'ANNUAL', month: 8, monthDay: 15, reason: 'Ferragosto', active: true },
    ]);
    const svc = new ClosureService(repo);

    const aug14 = await svc.isGiornoChiuso(dUTC(2026, 8, 14));
    expect(aug14.closed).toBe(false);

    const aug15 = await svc.isGiornoChiuso(dUTC(2026, 8, 15));
    expect(aug15.closed).toBe(true);
    expect(aug15.reason).toBe('Ferragosto');

    const aug15NextYear = await svc.isGiornoChiuso(dUTC(2027, 8, 15));
    expect(aug15NextYear.closed).toBe(true);
  });

  it('respects activation window with startDate and endDate', async () => {
    const repo = new FakeClosureRepo([
      { id: 's1', type: 'WEEKLY', weekday: 6, reason: 'sabato chiuso', active: true, startDate: '2026-05-10', endDate: '2026-05-31' },
    ]);
    const svc = new ClosureService(repo);

    // Before startDate (May 9, 2026 is Saturday) -> not yet active
    const before = await svc.isGiornoChiuso(dUTC(2026, 5, 9));
    expect(before.closed).toBe(false);

    // Within window (May 16, 2026 Saturday)
    const within = await svc.isGiornoChiuso(dUTC(2026, 5, 16));
    expect(within.closed).toBe(true);

    // After endDate (June 6, 2026 Saturday)
    const after = await svc.isGiornoChiuso(dUTC(2026, 6, 6));
    expect(after.closed).toBe(false);
  });

  it('combines multiple rules and returns first match reason', async () => {
    const repo = new FakeClosureRepo([
      { id: 'w', type: 'WEEKLY', weekday: 0, reason: 'domenica', active: true },
      { id: 's', type: 'SINGLE', date: '2026-12-25', reason: 'Natale', active: true },
    ]);
    const svc = new ClosureService(repo);

    const natale = await svc.isGiornoChiuso(dUTC(2026, 12, 25));
    expect(natale.closed).toBe(true);
    expect(natale.reason).toBe('Natale');
  });
});
