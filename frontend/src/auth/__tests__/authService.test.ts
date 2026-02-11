import * as authClient from '../../api/authClient';
import * as tokenStorage from '../tokenStorage';
import { login, signup, restore } from '../authService';

jest.mock('../../api/authClient');

describe('authService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
  });

  it('calls login endpoint with correct payload and persists tokens', async () => {
    const spy = jest.spyOn(authClient, 'login').mockResolvedValue({
      accessToken: 'at',
      accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      refreshToken: 'rt',
      refreshTokenExpiresAt: new Date(Date.now() + 86400_000).toISOString(),
      tokenType: 'Bearer',
      user: { id: 'u1', email: 'user@example.com' },
    });
    const setSpy = jest.spyOn(tokenStorage, 'setAuthState');

    const state = await login('user@example.com', 'secret', { baseUrl: '/api' });

    expect(spy).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' }, { baseUrl: '/api' });
    expect(setSpy).toHaveBeenCalled();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('at');
    expect(state.refreshToken).toBe('rt');
  });

  it('propagates error on failed login', async () => {
    jest.spyOn(authClient, 'login').mockRejectedValue(new Error('auth.invalid_credentials'));

    await expect(login('bad@example.com', 'wrong')).rejects.toThrow('auth.invalid_credentials');
  });

  it('calls signup endpoint with correct payload and returns data', async () => {
    const spy = jest.spyOn(authClient, 'signup').mockResolvedValue({
      user: { id: 'u2', email: 'new@example.com' },
    });
    const res = await signup('new@example.com', 'secret', { baseUrl: '/api' });
    expect(spy).toHaveBeenCalledWith({ email: 'new@example.com', password: 'secret' }, { baseUrl: '/api' });
    expect(res.user.email).toBe('new@example.com');
  });

  it('restore returns current auth state from storage', () => {
    localStorage.setItem(
      'demo.auth.state',
      JSON.stringify({ isAuthenticated: true, accessToken: 'x', refreshToken: 'y', user: { id: '1', email: 'a@b.com' } }),
    );
    const s = restore();
    expect(s.isAuthenticated).toBe(true);
    expect(s.accessToken).toBe('x');
  });
});
