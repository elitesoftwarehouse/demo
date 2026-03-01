// authService.ts - calls backend auth endpoints and handles token persistence
// Assumptions:
// - Backend exposes POST /auth/login and POST /auth/signup
// - Responses contain { accessToken, refreshToken?, user? }
// - If backend sets httpOnly refresh cookie, refreshToken may be omitted client-side

import { httpRequest } from '../../app/http/httpClient';
import { tokenStorage } from './tokenStorage';

export type AuthUser = {
  id: string;
  email: string;
  status?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
};

export type SignupResponse = LoginResponse & { message?: string };

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await httpRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const { accessToken, refreshToken, user } = res.data;
  if (!accessToken) throw new Error('Missing access token in response');
  tokenStorage.setTokens(accessToken, refreshToken);
  return { accessToken, refreshToken, user };
}

export async function signup(email: string, password: string): Promise<SignupResponse> {
  const res = await httpRequest<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: { email, password },
  });
  const { accessToken, refreshToken, user } = res.data;
  if (accessToken) tokenStorage.setTokens(accessToken, refreshToken);
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await httpRequest('/auth/logout', { method: 'POST' });
  } catch {
    // ignore network errors on logout
  }
  tokenStorage.clear();
}
