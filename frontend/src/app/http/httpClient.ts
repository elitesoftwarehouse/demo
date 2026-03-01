// httpClient.ts - minimal fetch wrapper with automatic Authorization header
// and JSON parsing. Keeps dependencies low.

import { tokenStorage } from '../../features/auth/tokenStorage';
import { apiConfig } from '../config/apiConfig';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  // If true, include credentials (cookies) for same-site/CSRF-protected flows.
  credentials?: RequestCredentials;
  // For endpoints requiring auth
  auth?: boolean;
  signal?: AbortSignal;
};

export type HttpResponse<T> = {
  status: number;
  ok: boolean;
  data: T;
  headers: Headers;
};

function buildHeaders(base?: Record<string, string>): Headers {
  const h = new Headers(base || {});
  if (!h.has('Content-Type')) h.set('Content-Type', 'application/json');
  return h;
}

export async function httpRequest<T = any>(path: string, options: HttpOptions = {}): Promise<HttpResponse<T>> {
  const { method = 'GET', body, headers, auth = false, credentials, signal } = options;
  const h = buildHeaders(headers);

  if (auth) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) h.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    method,
    headers: h,
    body: body != null ? JSON.stringify(body) : undefined,
    credentials: credentials || (apiConfig.refreshViaHttpOnlyCookie ? 'include' : 'same-origin'),
    signal,
  });

  const contentType = response.headers.get('Content-Type') || '';
  const isJson = contentType.includes('application/json');
  const data = (isJson ? await response.json().catch(() => null) : (await response.text().catch(() => ''))) as T;

  if (!response.ok) {
    const err: any = new Error((data as any)?.message || `HTTP ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return { status: response.status, ok: response.ok, data, headers: response.headers };
}
