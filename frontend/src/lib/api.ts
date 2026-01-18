// Minimal JSON API helper with error handling
// - Automatically sends/receives JSON
// - Throws typed errors with code/message coming from backend when available

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  token?: string; // optional bearer token
  signal?: AbortSignal;
}

export async function apiFetch<T = any>(url: string, opts?: ApiOptions): Promise<T> {
  const { method = 'GET', headers = {}, body, token, signal } = opts || {};

  const finalHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...headers,
  };
  const init: RequestInit = { method, headers: finalHeaders, signal };

  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code: string | undefined;
    let details: any;
    if (isJson) {
      try {
        const data = await res.json();
        message = data?.error?.message || message;
        code = data?.error?.code || data?.code;
        details = data?.error?.details || data?.details;
      } catch {
        // ignore
      }
    } else {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {
        // ignore
      }
    }
    const err: ApiError = Object.assign(new Error(message), { status: res.status, code, details });
    throw err;
  }

  if (isJson) {
    return (await res.json()) as T;
  }
  // @ts-expect-error allow non-json
  return (await res.text()) as T;
}
