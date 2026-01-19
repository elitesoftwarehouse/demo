export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
  user: { id: string; email: string; name?: string; role?: string };
}

const API_BASE = import.meta?.env?.VITE_API_BASE || '/';

let accessTokenMem: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessTokenMem = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// simple fetch wrapper with interceptor behavior
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (accessTokenMem) headers.set('Authorization', `Bearer ${accessTokenMem}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    if (res.status === 401) {
      try { onUnauthorized?.(); } catch {}
    }
    const error: any = new Error(body?.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.body = body;
    throw error;
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
