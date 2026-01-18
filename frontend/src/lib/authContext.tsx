import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isAuthenticated as tokenIsAuth, clearTokens, getAccessToken } from './authToken';
import { refresh } from './authService';

interface AuthContextValue {
  isAuthenticated: boolean;
  setAuthenticated: (v: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children, apiBaseUrl = '' }: { children: React.ReactNode; apiBaseUrl?: string }) {
  const [isAuthenticated, setAuthenticated] = useState<boolean>(tokenIsAuth());

  // Optional: try refresh on mount if access token expired but refresh exists
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (tokenIsAuth()) return; // already valid
      // If access token expired, authService.refresh will try rotate using refresh token
      try {
        const at = getAccessToken();
        if (!at) {
          // attempt silent refresh
          const res = await refresh(apiBaseUrl);
          if (!cancelled && res) {
            setAuthenticated(true);
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated,
    setAuthenticated,
    logout: () => {
      clearTokens();
      setAuthenticated(false);
    },
  }), [isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
