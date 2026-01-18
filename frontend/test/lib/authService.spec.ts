import { AuthService } from '../../src/lib/authService';

const fetchMock = global.fetch as jest.Mock;

describe('authService', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    localStorage.clear();
  });

  it('calls login endpoint with correct payload and saves tokens', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { accessToken: 'acc', tokenType: 'Bearer', expiresIn: 120, refreshToken: 'ref', user: { id: 'u1', email: 'e@example.com', status: 'ACTIVE' } } })
    });
    const svc = new AuthService({ apiBaseUrl: '' });
    const res = await svc.login('e@example.com', 'P@ssw0rd');

    expect(res.success).toBe(true);
    expect((global as any).fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }));
    // verify localStorage has access token
    expect(localStorage.getItem('auth.accessToken')).toBe('acc');
    expect(localStorage.getItem('auth.refreshToken')).toBe('ref');
  });

  it('propagates 401 error on login', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' } })
    });
    const svc = new AuthService();
    const res = await svc.login('x@example.com', 'bad');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
  });

  it('calls signup endpoint with correct payload', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, data: { id: 'u1', email: 'e@example.com', status: 'ACTIVE', createdAt: 'now', updatedAt: 'now' } })
    });
    const svc = new AuthService({ apiBaseUrl: '' });
    const res = await svc.signup('e@example.com', 'P@ssw0rd');

    expect(res.success).toBe(true);
    expect((global as any).fetch).toHaveBeenCalledWith('/api/auth/signup', expect.objectContaining({ method: 'POST' }));
  });

  it('propagates 400 error on signup', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: { message: 'Validation error', code: 'BAD_REQUEST' } })
    });
    const svc = new AuthService();
    const res = await svc.signup('bad', 'short');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('BAD_REQUEST');
  });
});
