// authService.ts - wraps calls to backend auth endpoints
import { saveTokens, getRefreshToken } from './authToken';

export async function login(payload: { email: string; password: string }, apiBaseUrl = ''): Promise<any> {
  const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok || !body?.success) {
    throw new Error(body?.error?.message || 'Login failed');
  }
  const data = body.data;
  if (data?.accessToken) {
    saveTokens(data.accessToken, data.refreshToken, data.expiresIn);
  }
  return data;
}

export async function signup(payload: { email: string; password: string }, apiBaseUrl = ''): Promise<any> {
  const res = await fetch(`${apiBaseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok || !body?.success) {
    throw new Error(body?.error?.message || 'Signup failed');
  }
  return body.data;
}

export async function refresh(apiBaseUrl = ''): Promise<any | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const res = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await safeJson(res);
  if (!res.ok || !body?.success) return null;
  const data = body.data;
  if (data?.accessToken) {
    saveTokens(data.accessToken, data.refreshToken, data.expiresIn);
  }
  return data;
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
