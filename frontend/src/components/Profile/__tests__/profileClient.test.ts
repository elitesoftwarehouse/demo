import { getProfile, updateProfile } from '../../../api/profileClient';

// Mock fetch
const g: any = globalThis as any;

describe('profileClient', () => {
  beforeEach(() => {
    g.fetch = jest.fn();
  });

  test('getProfile attaches Authorization header and parses json', async () => {
    (g.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'user@example.com' }) });
    const res = await getProfile({ baseUrl: '/api', accessToken: 'ACCESS' });
    expect(res.email).toBe('user@example.com');
    expect(g.fetch).toHaveBeenCalledWith('/api/profile/me', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: 'Bearer ACCESS' }),
    }));
  });

  test('updateProfile posts payload and returns updated profile', async () => {
    (g.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'user@example.com', firstName: 'A' }) });
    const res = await updateProfile({ firstName: 'A' }, { baseUrl: '/api', accessToken: 'ACCESS' });
    expect(res.firstName).toBe('A');
    expect(g.fetch).toHaveBeenCalledWith('/api/profile/me', expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ Authorization: 'Bearer ACCESS', 'Content-Type': 'application/json' }),
      body: JSON.stringify({ firstName: 'A' }),
    }));
  });

  test('getProfile throws on non-200', async () => {
    (g.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'boom' }) });
    await expect(getProfile({} as any)).rejects.toThrow('boom');
  });

  test('updateProfile throws and exposes details', async () => {
    (g.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'invalid', details: { firstName: 'too_short' } }) });
    await expect(updateProfile({ firstName: 'A' }, {} as any)).rejects.toThrow('invalid');
  });
});
