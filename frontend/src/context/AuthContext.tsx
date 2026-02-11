import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SignupSuccessResponse } from '../api/authClient';
import * as authService from '../auth/authService';
import { getAuthState, setAuthState, clearAuthState, type StoredAuthState } from '../auth/tokenStorage';

export type AuthContextValue = {
  state: StoredAuthState;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<StoredAuthState>;
  signup: (email: string, password: string) => Promise<SignupSuccessResponse>;
  logout: () => void;
};

const Ctx = createContext<AuthContextValue | undefined>(undefined);

export type AuthProviderProps = {
  baseUrl?: string;
  onLoginSuccess?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
};

export function AuthProvider({ baseUrl = '/api', onLoginSuccess, onLogout, children }: AuthProviderProps) {
  const [state, setState] = useState<StoredAuthState>(() => getAuthState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session from storage on mount (already done by initial state); ensure shape persisted
  useEffect(() => {
    setState(getAuthState());
  }, []);

  const setAndPersist = useCallback((next: StoredAuthState) => {
    setState(next);
    setAuthState(next);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const next = await authService.login(email, password, { baseUrl });
        setAndPersist(next);
        onLoginSuccess && onLoginSuccess();
        return next;
      } catch (e: any) {
        const code = e?.message || 'auth.login_failed';
        setError(code);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, onLoginSuccess, setAndPersist],
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await authService.signup(email, password, { baseUrl });
        return res;
      } catch (e: any) {
        const code = e?.message || 'auth.signup_failed';
        setError(code);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  const logout = useCallback(() => {
    clearAuthState();
    setState({ isAuthenticated: false, accessToken: undefined, refreshToken: undefined, user: null });
    onLogout && onLogout();
  }, [onLogout]);

  const value = useMemo<AuthContextValue>(
    () => ({ state, loading, error, login, signup, logout }),
    [state, loading, error, login, signup, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>');
  return ctx;
}
