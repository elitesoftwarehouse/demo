import { getAuthState, setAuthState, clearAuthState, StoredAuthState } from '../tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('returns unauthenticated state when storage empty', () => {
    const s = getAuthState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
  });

  it('persists and restores authenticated state when accessToken present', () => {
    const next: StoredAuthState = {
      isAuthenticated: true,
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'u1', email: 'a@b.com' },
    };
    setAuthState(next);
    const restored = getAuthState();
    expect(restored.isAuthenticated).toBe(true);
    expect(restored.accessToken).toBe('at');
  });

  it('forces isAuthenticated=false if accessToken missing', () => {
    const broken = { isAuthenticated: true, user: { id: '1', email: 'x@y.z' } } as any;
    localStorage.setItem('demo.auth.state', JSON.stringify(broken));
    const s = getAuthState();
    expect(s.isAuthenticated).toBe(false);
  });

  it('handles invalid JSON gracefully', () => {
    localStorage.setItem('demo.auth.state', '{invalid');
    const s = getAuthState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
  });

  it('handles storage getItem throwing', () => {
    const spy = jest.spyOn(window.localStorage.__proto__, 'getItem');
    spy.mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const s = getAuthState();
    expect(s.isAuthenticated).toBe(false);
  });

  it('clearAuthState removes from storage', () => {
    const next: StoredAuthState = {
      isAuthenticated: true,
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'u1', email: 'a@b.com' },
    };
    setAuthState(next);
    expect(localStorage.getItem('demo.auth.state')).toBeTruthy();
    clearAuthState();
    expect(localStorage.getItem('demo.auth.state')).toBeNull();
  });
});
