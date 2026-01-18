import { ClosureService } from '../ClosureService';
import { InMemoryClosureRepository } from '../InMemoryClosureRepository';

describe('ClosureService - isGiornoChiuso', () => {
  it('detects weekly weekend closures', async () => {
    const repo = new InMemoryClosureRepository([
      { id: '1', type: 'WEEKLY', weekday: 0, active: true, reason: 'Sunday' },
      { id: '2', type: 'WEEKLY', weekday: 6, active: true, reason: 'Saturday' },
    ]);
    const svc = new ClosureService(repo);

    const sat = new Date('2026-01-17T10:00:00Z'); // Saturday
    const sun = new Date('2026-01-18T10:00:00Z'); // Sunday
    const mon = new Date('2026-01-19T10:00:00Z'); // Monday

    await expect(svc.isGiornoChiuso(sat)).resolves.toMatchObject({ closed: true });
    await expect(svc.isGiornoChiuso(sun)).resolves.toMatchObject({ closed: true });
    await expect(svc.isGiornoChiuso(mon)).resolves.toMatchObject({ closed: false });
  });

  it('detects single date closure', async () => {
    const repo = new InMemoryClosureRepository([
      { id: '3', type: 'SINGLE', date: '2026-12-24', active: true, reason: 'Christmas Eve' },
    ]);
    const svc = new ClosureService(repo);

    await expect(svc.isGiornoChiuso(new Date('2026-12-24T08:00:00Z'))).resolves.toMatchObject({ closed: true });
    await expect(svc.isGiornoChiuso(new Date('2026-12-25T08:00:00Z'))).resolves.toMatchObject({ closed: false });
  });

  it('detects annual closure', async () => {
    const repo = new InMemoryClosureRepository([
      { id: '4', type: 'ANNUAL', month: 1, monthDay: 1, active: true, reason: 'New Year' },
    ]);
    const svc = new ClosureService(repo);
    await expect(svc.isGiornoChiuso(new Date('2026-01-01T10:00:00Z'))).resolves.toMatchObject({ closed: true });
    await expect(svc.isGiornoChiuso(new Date('2026-01-02T10:00:00Z'))).resolves.toMatchObject({ closed: false });
  });

  it('honors activation window', async () => {
    const repo = new InMemoryClosureRepository([
      { id: '5', type: 'WEEKLY', weekday: 1, active: true, startDate: '2026-02-01', endDate: '2026-02-28' },
    ]);
    const svc = new ClosureService(repo);

    await expect(svc.isGiornoChiuso(new Date('2026-01-26T10:00:00Z'))).resolves.toMatchObject({ closed: false }); // Mon Jan
    await expect(svc.isGiornoChiuso(new Date('2026-02-02T10:00:00Z'))).resolves.toMatchObject({ closed: true }); // Mon Feb
    await expect(svc.isGiornoChiuso(new Date('2026-03-02T10:00:00Z'))).resolves.toMatchObject({ closed: false }); // Mon Mar
  });
});
