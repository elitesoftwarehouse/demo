import { fetchDesks } from '../../src/lib/desksApi';

describe('desksApi.fetchDesks', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch as any;
    jest.restoreAllMocks();
  });

  it('resolves data on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { total: 1, expected: 12, missing: 11, items: [{ id: 'D1', name: 'Desk 1', status: 'FREE' }], statusCount: { FREE: 1, OCCUPIED: 0, UNAVAILABLE: 0 } } }) });
    const data = await fetchDesks('');
    expect(data?.total).toBe(1);
    expect(data.items[0].id).toBe('D1');
  });

  it('throws on non-ok http', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchDesks('')).rejects.toThrow('HTTP 500');
  });

  it('throws when success=false', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, error: { message: 'boom' } }) });
    await expect(fetchDesks('')).rejects.toThrow('boom');
  });
});
