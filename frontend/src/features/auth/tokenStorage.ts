// tokenStorage.ts - wrapper to safely persist tokens in chosen storage
// Security note:
// - Prefer httpOnly, Secure cookies set by the backend for refresh tokens.
// - As a temporary solution, we may store access/refresh tokens in Web Storage.
//   This exposes them to XSS risks. Keep your app free of inline scripts and
//   enable CSP. Plan migration to httpOnly refresh cookies.

import { apiConfig } from '../../app/config/apiConfig';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return apiConfig.tokenStorage === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function safeGet(key: string): string | null {
  const s = getStorage();
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null): void {
  const s = getStorage();
  if (!s) return;
  try {
    if (value == null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // ignore quota/availability errors
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return safeGet(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    if (apiConfig.refreshViaHttpOnlyCookie) return null; // cookie expected server-side
    return safeGet(REFRESH_KEY);
  },
  setTokens(accessToken: string, refreshToken?: string | null) {
    safeSet(ACCESS_KEY, accessToken);
    if (!apiConfig.refreshViaHttpOnlyCookie) {
      safeSet(REFRESH_KEY, refreshToken || null);
    }
  },
  clear() {
    safeSet(ACCESS_KEY, null);
    safeSet(REFRESH_KEY, null);
  },
};

export default tokenStorage;
