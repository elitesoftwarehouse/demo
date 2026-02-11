// HTTP client wrapper that attaches Authorization header automatically for protected requests.
// It reads the access token from tokenStorage. For public endpoints, you can use fetch directly.

import { getAccessToken } from './tokenStorage';

export type HttpClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
};

function buildUrl(baseUrl: string | undefined, path: string): string {
  const base = baseUrl || '';
  if (!base) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function httpGet<T>(path: string, opts?: HttpClientOptions): Promise<T> {
  const f = opts?.fetchImpl || fetch;
  const url = buildUrl(opts?.baseUrl, path);
  const token = getAccessToken();
  const res = await f(url, {
    method: 'GET',
    headers: {
      ...(opts?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    throw Object.assign(new Error('Request failed'), { status: res.status, payload: data });
  }
  return data as T;
}

export async function httpPost<T>(path: string, body?: any, opts?: HttpClientOptions): Promise<T> {
  const f = opts?.fetchImpl || fetch;
  const url = buildUrl(opts?.baseUrl, path);
  const token = getAccessToken();
  const res = await f(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    throw Object.assign(new Error('Request failed'), { status: res.status, payload: data });
  }
  return data as T;
}
