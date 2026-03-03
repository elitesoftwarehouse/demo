// Service client for fetching station statuses from backend
// Handles primary endpoint and fallback for backward compatibility

export type StationStatus = 'FREE' | 'OCCUPIED' | 'UNAVAILABLE';

export type StationStatusDTO = {
  id: string;
  name: string;
  status: StationStatus;
  updatedAt?: string;
};

export const STATIONS_ENDPOINT_PRIMARY = '/api/postazioni/status';
export const STATIONS_ENDPOINT_FALLBACK = '/api/stations';

export async function fetchStationsStatus(options: {
  token?: string | null;
  signal?: AbortSignal;
  endpoint?: string; // override for tests
} = {}): Promise<StationStatusDTO[]> {
  const { token, signal, endpoint } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Try primary endpoint first, then fallback if 404 (older servers)
  const urls = [endpoint || STATIONS_ENDPOINT_PRIMARY, STATIONS_ENDPOINT_FALLBACK];

  let lastErr: any;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const res = await fetch(url, { headers, signal, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data)) return [];
        return data as StationStatusDTO[];
      }
      // If primary returns 404, try fallback; otherwise throw
      if (!(res.status === 404 && i === 0)) {
        const err = new Error(`HTTP ${res.status}`);
        (err as any).status = res.status;
        throw err;
      }
    } catch (e) {
      // If aborted, rethrow immediately
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      lastErr = e;
      // try next url if available
    }
  }

  // If we reach here, both attempts failed
  if (lastErr) throw lastErr;
  return [];
}
