// authInterceptor.ts - optional helper to refresh access token on 401 responses
// This uses a simple in-memory lock to avoid concurrent refresh calls.

import { httpRequest } from './httpClient';
import { tokenStorage } from '../../features/auth/tokenStorage';

let refreshing = false;
let waiters: Array<() => void> = [];

function subscribe(cb: () => void) {
  waiters.push(cb);
}
function notifyAll() {
  waiters.forEach((cb) => cb());
  waiters = [];
}

export async function fetchWithAuthRetry<T>(path: string, init: Parameters<typeof httpRequest>[1] = {}): Promise<T> {
  try {
    const res = await httpRequest<T>(path, { ...init, auth: true });
    return res.data;
  } catch (err: any) {
    if (err.status !== 401) throw err;

    if (!refreshing) {
      refreshing = true;
      try {
        await httpRequest('/auth/refresh', { method: 'POST' });
        // If backend uses cookie rotation, new access token might be returned in body or requires another call
        // Here we attempt to read access token from body; if absent, we expect another strategy to set it.
      } catch (_) {
        tokenStorage.clear();
        refreshing = false;
        notifyAll();
        throw err;
      }
      refreshing = false;
      notifyAll();
    } else {
      await new Promise<void>((resolve) => subscribe(resolve));
    }

    const retry = await httpRequest<T>(path, { ...init, auth: true });
    return retry.data;
  }
}
