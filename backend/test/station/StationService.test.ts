import { StationService } from '../../src/modules/station/service/StationService';

describe('StationService', () => {
  it('returns 12 stations with required fields', async () => {
    const svc = new StationService();
    const all = await svc.getAll();
    expect(all.length).toBe(12);
    for (let i = 0; i < all.length; i++) {
      const s = all[i];
      expect(typeof s.id).toBe('string');
      expect(typeof s.name).toBe('string');
      expect(['FREE', 'OCCUPIED', 'UNAVAILABLE']).toContain(s.status);
    }
  });

  it('can update a station status', async () => {
    const svc = new StationService();
    await svc.setStatus('1', 'FREE');
    const all = await svc.getAll();
    const s1 = all.find(s => s.id === '1');
    expect(s1?.status).toBe('FREE');
  });
});
