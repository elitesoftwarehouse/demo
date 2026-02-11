import React from 'react';
import { renderHook } from '@testing-library/react';
import { AuthProvider } from '../../context/AuthContext';
import { useAuth } from '../../hooks/useAuth';

describe('useAuth hook', () => {
  function wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  it('exposes state, loading, error and actions', () => {
    const { result } = renderHook(() => useAuth('/api'), { wrapper });
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.baseUrl).toBe('/api');
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.signup).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });
});
