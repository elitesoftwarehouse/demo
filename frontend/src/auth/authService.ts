import { login as apiLogin, signup as apiSignup } from '../api/authClient';
import { getAuthState, setAuthState, type StoredAuthState } from './tokenStorage';

export type AuthServiceOptions = { baseUrl?: string };

export async function login(
  email: string,
  password: string,
  options?: AuthServiceOptions,
): Promise<StoredAuthState> {
  const baseUrl = options?.baseUrl || '/api';
  const res = await apiLogin({ email, password }, { baseUrl });
  const next: StoredAuthState = {
    isAuthenticated: true,
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    user: res.user,
  };
  setAuthState(next);
  return next;
}

export async function signup(email: string, password: string, options?: AuthServiceOptions) {
  const baseUrl = options?.baseUrl || '/api';
  const res = await apiSignup({ email, password }, { baseUrl });
  return res;
}

export function restore(): StoredAuthState {
  return getAuthState();
}
