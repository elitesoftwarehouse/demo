export type StoredUser = { id: string; email: string; status?: string } | null;
export type StoredAuthState = {
  isAuthenticated: boolean;
  accessToken?: string;
  refreshToken?: string;
  user: StoredUser;
};

const KEY = 'demo.auth.state';

export function getAuthState(): StoredAuthState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { isAuthenticated: false, user: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { isAuthenticated: false, user: null };
    return {
      isAuthenticated: !!parsed.isAuthenticated && !!parsed.accessToken,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      user: parsed.user || null,
    } as StoredAuthState;
  } catch {
    return { isAuthenticated: false, user: null };
  }
}

export function setAuthState(next: StoredAuthState) {
  const payload = JSON.stringify(next);
  localStorage.setItem(KEY, payload);
}

export function clearAuthState() {
  localStorage.removeItem(KEY);
}
