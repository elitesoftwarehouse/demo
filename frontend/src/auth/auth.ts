import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Types from backend contract
export interface LoginDto { email: string; password: string; }
interface JwtLoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // seconds
  user: {
    id: string;
    email?: string;
    name?: string;
    role?: string;
    tenantId?: string;
  };
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // epoch ms
  user: JwtLoginResponse['user'] | null;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'smartdesk/auth';
const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:3000';

function loadPersistedAuth(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null, expiresAt: null, user: null };
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return { accessToken: null, refreshToken: null, expiresAt: null, user: null };
  }
}

function persistAuth(state: AuthState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function clearPersistedAuth() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => loadPersistedAuth());
  const tokenRef = useRef(null as unknown as string | null);
  tokenRef.current = state.accessToken;

  useEffect(() => {
    tokenRef.current = state.accessToken;
    persistAuth(state);
  }, [state]);

  // Auto-logout on token expiry (no refresh flow available in backend by default)
  useEffect(() => {
    if (!state.expiresAt) return;
    const now = Date.now();
    const ms = state.expiresAt - now;
    if (ms <= 0) {
      setState({ accessToken: null, refreshToken: null, expiresAt: null, user: null });
      clearPersistedAuth();
      return;
    }
    const t = setTimeout(() => {
      setState({ accessToken: null, refreshToken: null, expiresAt: null, user: null });
      clearPersistedAuth();
    }, ms);
    return () => clearTimeout(t);
  }, [state.expiresAt]);

  const login = useCallback(async (email: string, password: string) => {
    const body: LoginDto = { email, password };
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await safeJson(res);
      const message = errBody?.error || `Login failed (${res.status})`;
      const error = new Error(message) as any;
      error.status = res.status;
      throw error;
    }

    const data = (await res.json()) as JwtLoginResponse;
    const expiresAt = Date.now() + data.expiresIn * 1000;

    const next: AuthState = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || null,
      expiresAt,
      user: data.user,
    };
    setState(next);
    persistAuth(next);
  }, []);

  const logout = useCallback(() => {
    setState({ accessToken: null, refreshToken: null, expiresAt: null, user: null });
    clearPersistedAuth();
  }, []);

  const value = useMemo((): AuthContextValue => (
    {
      ...state,
      isAuthenticated: Boolean(state.accessToken && state.user),
      login,
      logout,
    }
  ), [state, login, logout]);

  // Avoid JSX in .ts file
  return React.createElement(AuthContext.Provider as any, { value }, children as any);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Simple fetch wrapper that injects Authorization and logs out on 401
export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit) {
  const stored = loadPersistedAuth();
  const headers = new Headers(init?.headers || {});
  if (stored.accessToken) {
    headers.set('Authorization', `Bearer ${stored.accessToken}`);
  }
  const res = await fetch(input instanceof URL ? input.toString() : input, { ...init, headers });
  if (res.status === 401) {
    // Token invalid or expired -> clear and optionally redirect handled by UI
    clearPersistedAuth();
  }
  return res;
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ProtectedRoute for React Router v6
export function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    // Defer redirect handling to route usage by returning null in non-router context
    return null;
  }
  return children;
}
