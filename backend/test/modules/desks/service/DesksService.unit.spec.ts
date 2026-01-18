import { DesksService } from '../../../../src/modules/desks/service/DesksService';
import { InMemoryDesksRepository } from '../../../../src/modules/desks/repository/DesksRepository';
import type { Desk } from '../../../../src/modules/desks/domain/Desk';

function mkDesks(n: number, status: 'FREE'|'OCCUPIED'|'UNAVAILABLE' = 'FREE'): Desk[] {
  return Array.from({ length: n }).map((_, i) => ({ id: `D${i+1}`, name: `Desk ${i+1}`, status }));
}

describe('DesksService - counts and missing handling', () => {
  it('handles 0 desks', async () => {
    const repo = new InMemoryDesksRepository([]);
    const svc = new DesksService(repo);
    const res = await svc.getDesks();
    expect(res.total).toBe(0);
    expect(res.expected).toBe(12);
    expect(res.missing).toBe(12);
    expect(res.statusCount.FREE + res.statusCount.OCCUPIED + res.statusCount.UNAVAILABLE).toBe(0);
  });

  it('handles exactly 12 desks', async () => {
    const repo = new InMemoryDesksRepository(mkDesks(12, 'FREE'));
    const svc = new DesksService(repo);
    const res = await svc.getDesks();
    expect(res.total).toBe(12);
    expect(res.missing).toBe(0);
    expect(res.statusCount.FREE).toBe(12);
  });

  it('handles fewer than 12 desks', async () => {
    const desks: Desk[] = [
      { id: 'D1', name: 'Desk 1', status: 'FREE' },
      { id: 'D2', name: 'Desk 2', status: 'OCCUPIED' },
      { id: 'D3', name: 'Desk 3', status: 'UNAVAILABLE' },
    ];
    const repo = new InMemoryDesksRepository(desks);
    const svc = new DesksService(repo);
    const res = await svc.getDesks();
    expect(res.total).toBe(3);
    expect(res.missing).toBe(9);
    expect(res.statusCount).toEqual({ FREE: 1, OCCUPIED: 1, UNAVAILABLE: 1 });
  });
});
