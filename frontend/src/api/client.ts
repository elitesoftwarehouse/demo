import { fetchWithAuth } from '../auth/auth';

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:3000';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE}${path}`, { method: 'GET' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}
