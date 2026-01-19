const AUTH_STORAGE_KEY = 'smartdesk.auth';

export interface StoredAuth {
  accessToken: string;
  refreshToken?: string;
  user: { id: string; email: string; name?: string; role?: string };
  expiresAt: number; // epoch ms
}

export function saveAuth(data: StoredAuth) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function loadAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
}
