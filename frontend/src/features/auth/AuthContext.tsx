// AuthContext.tsx - React context to expose auth state and actions
// Keeps the minimal shape to support login/logout & token restoration.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginApi, signup as signupApi, logout as logoutApi, type AuthUser } from './authService';
import { tokenStorage } from './tokenStorage';

export type AuthState = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
};

export type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount if access token exists
  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      // Optionally decode token and get basic info; for now just mark authenticated
      setUser((prev) => prev || null);
    }
    setLoading(false);
  }, []);

  const doLogin = useCallback(async (email: string, password: string) => {
    setError(null);
    const { user } = await loginApi(email, password);
    if (user) setUser(user);
  }, []);

  const doSignup = useCallback(async (email: string, password: string) => {
    setError(null);
    const { user } = await signupApi(email, password);
    if (user) setUser(user);
  }, []);

  const doLogout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated: !!tokenStorage.getAccessToken(),
    user,
    loading,
    error,
    login: async (e, p) => {
      try {
        await doLogin(e, p);
      } catch (err: any) {
        setError(err?.message || 'Login failed');
        throw err;
      }
    },
    signup: async (e, p) => {
      try {
        await doSignup(e, p);
      } catch (err: any) {
        setError(err?.message || 'Signup failed');
        throw err;
      }
    },
    logout: doLogout,
    setUser,
  }), [user, loading, error, doLogin, doSignup, doLogout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
