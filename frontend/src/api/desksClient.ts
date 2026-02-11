import { getAuthState } from '../auth/tokenStorage';

export type DeskStatus = 'free' | 'busy' | 'unavailable';

export type DesksClientOptions = {
  baseUrl?: string;
  signal?: AbortSignal;
};

export type DeskStatusItem = {
  id: string;
  status: DeskStatus;
  name?: string;
  // optional positional metadata if backend provides it
  x?: number;
  y?: number;
};

function mapApiStatus(input: any): DeskStatus {
  const v = String(input || '').toLowerCase();
  switch (v) {
    case 'free':
    case 'available':
    case 'libero':
      return 'free';
    case 'busy':
    case 'occupied':
    case 'occupato':
    case 'reserved':
      return 'busy';
    default:
      return 'unavailable';
  }
}

function normalizeArrayPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.desks)) return data.desks;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchDeskStatuses(opts?: DesksClientOptions): Promise<DeskStatusItem[]> {
  const base = opts?.baseUrl || '/api';
  const url = `${base}/desks/status`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const auth = getAuthState();
  if (auth?.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;

  const res = await fetch(url, { method: 'GET', signal: opts?.signal, headers });
  if (!res.ok) {
    let msg = `desk_status.fetch_failed_${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const data = await res.json();
  const arr = normalizeArrayPayload(data);
  return arr
    .map((raw: any) => {
      const id = String(raw?.id ?? raw?.deskId ?? raw?.code ?? '');
      const status = mapApiStatus(raw?.status ?? raw?.state);
      const name = raw?.name ? String(raw.name) : undefined;
      const x = typeof raw?.x === 'number' ? raw.x : undefined;
      const y = typeof raw?.y === 'number' ? raw.y : undefined;
      return id ? ({ id, status, name, x, y } as DeskStatusItem) : null;
    })
    .filter(Boolean) as DeskStatusItem[];
}
