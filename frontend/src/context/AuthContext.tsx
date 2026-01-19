import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loginApi, setAccessToken, setUnauthorizedHandler } from '../lib/api';
import { clearAuth, loadAuth, saveAuth } from '../lib/storage';

export interface AuthUser { id: string; email: string; name?: string; role?: string }

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // hydrate from storage on mount
  useEffect(() => {
    const stored = loadAuth();
    if (stored && stored.accessToken && stored.expiresAt > Date.now()) {
      setUser(stored.user);
      setToken(stored.accessToken);
      setAccessToken(stored.accessToken);
    } else {
      clearAuth();
    }
  }, []);

  // global 401 handler -> logout
  useEffect(() => {
    setUnauthorizedHandler(() => () => {
      setUser(null);
      setToken(null);
      setAccessToken(null);
      clearAuth();
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginApi(email, password);
      const expiresAt = Date.now() + res.expiresIn * 1000 - 5000; // small skew
      setUser(res.user);
      setToken(res.accessToken);
      setAccessToken(res.accessToken);
      saveAuth({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user, expiresAt });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setAccessToken(null);
    clearAuth();
  }, []);

  const value = useMemo(() => ({ user, accessToken, isLoading, login, logout }), [user, accessToken, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
