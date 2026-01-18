// authToken.ts - localStorage-based token handling
// Stores access/refresh tokens and approximate expiry

const ACCESS_KEY = 'auth.accessToken';
const REFRESH_KEY = 'auth.refreshToken';
const EXPIRES_AT_KEY = 'auth.expiresAt';

export function saveTokens(accessToken: string, refreshToken?: string, expiresIn?: number) {
  try {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) {
      const ts = Date.now() + expiresIn * 1000 - 5000; // small skew
      localStorage.setItem(EXPIRES_AT_KEY, String(ts));
    }
  } catch {}
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  try {
    const token = getAccessToken();
    if (!token) return false;
    const exp = localStorage.getItem(EXPIRES_AT_KEY);
    if (!exp) return true; // fallback when missing
    return Date.now() < parseInt(exp, 10);
  } catch {
    return false;
  }
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
  } catch {}
}
