import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../../context/AuthContext';

// Mock authService and token storage
jest.mock('../../auth/authService', () => ({
  login: jest.fn(async (email: string, password: string) => ({
    isAuthenticated: true,
    accessToken: 'at',
    refreshToken: 'rt',
    user: { id: 'u1', email },
  })),
  signup: jest.fn(async (email: string, password: string) => ({
    user: { id: 'u2', email },
  })),
}));

const setItem = jest.spyOn(window.localStorage.__proto__, 'setItem');
const getItem = jest.spyOn(window.localStorage.__proto__, 'getItem');
const removeItem = jest.spyOn(window.localStorage.__proto__, 'removeItem');

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider baseUrl="/api">{children}</AuthProvider>;
  }

  it('derives initial state from storage (unauthenticated by default)', () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.user).toBeNull();
  });

  it('login updates state and persists', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await act(async () => {
      await result.current.login('test@example.com', 'secret');
    });
    expect(result.current.state.isAuthenticated).toBe(true);
    expect(result.current.state.user?.email).toBe('test@example.com');
    expect(setItem).toHaveBeenCalled();
  });

  it('signup returns user and does not authenticate by default', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await act(async () => {
      const res = await result.current.signup('new@example.com', 'secret');
      expect(res.user.email).toBe('new@example.com');
    });
    expect(result.current.state.isAuthenticated).toBe(false);
  });

  it('logout clears storage and resets state', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await act(async () => {
      await result.current.login('test@example.com', 'secret');
    });
    await act(async () => {
      result.current.logout();
    });
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(removeItem).toHaveBeenCalled();
  });
});
