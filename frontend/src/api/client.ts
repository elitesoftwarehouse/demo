import { fetchWithAuth } from '../auth/auth';

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:3000';

function buildError(res: Response, body: any) {
  const err = new Error(
    body?.message || body?.error || `Request failed: ${res.status}`
  ) as any;
  (err.status = res.status), (err.code = body?.error), (err.details = body);
  return err;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE}${path}`, { method: 'GET' });
  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    throw buildError(res, body);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let errBody: any = null;
    try {
      errBody = await res.json();
    } catch {
      // ignore
    }
    throw buildError(res, errBody);
  }
  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string, body?: any): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let errBody: any = null;
    try {
      errBody = await res.json();
    } catch {
      // ignore
    }
    throw buildError(res, errBody);
  }
  return (await res.json()) as T;
}
