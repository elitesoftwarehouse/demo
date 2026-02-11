import { useMemo } from 'react';
import { useAuthContext } from '../context/AuthContext';

export type AuthState = {
  isAuthenticated: boolean;
};

export function useAuth(baseUrl?: string) {
  const ctx = useAuthContext();
  return useMemo(
    () => ({
      login: ctx.login,
      signup: ctx.signup,
      logout: ctx.logout,
      loading: ctx.loading,
      error: ctx.error,
      state: ctx.state,
      baseUrl: baseUrl || '/api',
    }),
    [ctx, baseUrl],
  );
}
