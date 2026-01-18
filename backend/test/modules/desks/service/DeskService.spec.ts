import { DeskService } from '../../../../src/modules/desks/service/DeskService';
import { InMemoryDeskRepository } from '../../../../src/modules/desks/repository/DeskRepository';

describe('DeskService - getAllStatuses', () => {
  it('returns 12 desks with required fields and default LIBERA status', async () => {
    const repo = new InMemoryDeskRepository();
    const svc = new DeskService(repo);
    const list = await svc.getAllStatuses();

    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(12);
    for (const d of list) {
      expect(d).toHaveProperty('id');
      expect(d).toHaveProperty('label');
      expect(d).toHaveProperty('status');
      expect(['LIBERA', 'OCCUPATA', 'NON_DISPONIBILE']).toContain(d.status);
      expect(typeof d.updatedAt).toBe('string');
    }
  });

  it('supports updating status via repository and reflects changes', async () => {
    const repo = new InMemoryDeskRepository();
    const svc = new DeskService(repo);

    await repo.setStatus('desk-3', 'OCCUPATA');
    const list = await svc.getAllStatuses();

    const d3 = list.find((d) => d.id === 'desk-3');
    expect(d3?.status).toBe('OCCUPATA');
  });
});
