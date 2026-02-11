import { fetchDeskStatuses } from '../desksClient';

// declare jest
declare const jest: any;

describe('desksClient - fetchDeskStatuses', () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
  });

  test('parses success payloads with various shapes', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ desks: [ { id: 'D01', status: 'available' }, { id: 'D02', status: 'occupied' } ] }),
    })) as any;

    const out = await fetchDeskStatuses({ baseUrl: '/api' });
    expect(out).toEqual([
      { id: 'D01', status: 'free' },
      { id: 'D02', status: 'busy' },
    ]);
  });

  test('throws on error response with status code', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 503, json: async () => ({ error: 'service_unavailable' }) })) as any;
    await expect(fetchDeskStatuses({ baseUrl: '/api' })).rejects.toThrow('service_unavailable');
  });
});
