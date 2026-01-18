import { clearTokens, getAccessToken, getRefreshToken, getStoredTokens, isAuthenticated, saveTokens } from '../../src/lib/authToken';

describe('tokenStorage (authToken)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves tokens correctly', () => {
    saveTokens({ accessToken: 'a1', refreshToken: 'r1', expiresIn: 60 });
    expect(getAccessToken()).toBe('a1');
    expect(getRefreshToken()).toBe('r1');

    const stored = getStoredTokens();
    expect(stored?.accessToken).toBe('a1');
    expect(stored?.refreshToken).toBe('r1');
    expect(typeof stored?.accessTokenExpiresAt).toBe('number');
  });

  it('clearTokens removes all tokens', () => {
    saveTokens({ accessToken: 'a2', refreshToken: 'r2', expiresIn: 60 });
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns false when access token is missing', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns false when expired', () => {
    saveTokens({ accessToken: 'a3', expiresIn: 0 });
    // Force expiry timestamp to past
    const key = 'auth.accessToken.expiresAt';
    localStorage.setItem(key, String(Date.now() - 1000));
    expect(isAuthenticated()).toBe(false);
  });
});
