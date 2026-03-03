import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Simple AuthContext to manage JWT tokens and authentication state
// - Persists tokens in localStorage
// - Restores state on refresh
// - Exposes helpers to login, signup, logout, and set user

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  login: (payload: { tokens: AuthTokens; user: AuthUser }) => void;
  signup: (payload: { tokens: AuthTokens; user: AuthUser }) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  replaceTokens: (tokens: AuthTokens | null) => void;
};

const STORAGE_KEYS = {
  accessToken: 'auth.accessToken',
  refreshToken: 'auth.refreshToken',
  user: 'auth.user',
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Restore from storage on first load
  useEffect(() => {
    try {
      const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
      const userStr = localStorage.getItem(STORAGE_KEYS.user);

      if (accessToken && refreshToken) {
        setTokens({ accessToken, refreshToken });
      }
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (err) {
      // ignore parsing/storage errors
    }
  }, []);

  const persist = useCallback((nextTokens: AuthTokens | null, nextUser: AuthUser | null) => {
    if (nextTokens?.accessToken && nextTokens?.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.accessToken, nextTokens.accessToken);
      localStorage.setItem(STORAGE_KEYS.refreshToken, nextTokens.refreshToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
    }

    if (nextUser) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  }, []);

  const login = useCallback((payload: { tokens: AuthTokens; user: AuthUser }) => {
    setTokens(payload.tokens);
    setUser(payload.user);
    persist(payload.tokens, payload.user);
  }, [persist]);

  const signup = useCallback((payload: { tokens: AuthTokens; user: AuthUser }) => {
    setTokens(payload.tokens);
    setUser(payload.user);
    persist(payload.tokens, payload.user);
  }, [persist]);

  const logout = useCallback(() => {
    setTokens(null);
    setUser(null);
    persist(null, null);
  }, [persist]);

  const replaceTokens = useCallback((next: AuthTokens | null) => {
    setTokens(next);
    persist(next, user);
  }, [persist, user]);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated: Boolean(tokens?.accessToken),
    user,
    tokens,
    login,
    signup,
    logout,
    setUser,
    replaceTokens,
  }), [tokens, user, login, signup, logout, replaceTokens]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
