// MyBookingsService - fetch user's bookings list with optional pagination
// Primary endpoint: GET /api/bookings/me?from=&to=&limit=&cursor=&order=&status=
// Fallback: in-memory stub generating deterministic sample data

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'PASSATA' | 'ATTIVA' | 'CANCELLATA';

export type BookingItem = {
  id: string;
  deskId: string;
  deskName?: string | null;
  date: string; // YYYY-MM-DD (date-only)
  status: BookingStatus;
  // Optional time window. If absent, assume all-day booking
  startTime?: string | null; // HH:mm
  endTime?: string | null;   // HH:mm
  // Optional location fields
  locationName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type FetchMyBookingsResponse = {
  items: BookingItem[];
  nextCursor?: string | null;
};

export type Scope = 'future' | 'past' | 'all';

export type StatusFilter = 'ATTIVA' | 'PASSATA' | 'CANCELLATA' | 'ALL' | 'NONE';

export type FetchMyBookingsOptions = {
  token?: string | null;
  limit?: number; // default 20
  cursor?: string | null;
  scope?: Scope; // default 'future'
  status?: StatusFilter; // optional single-status filter (UI quick filter)
  endpoint?: string; // override base endpoint (for tests)
  // Used only by stub to tailor deterministic data per user
  userId?: string;
};

function buildHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayKey() {
  return toDateKey(new Date());
}

function addDays(d: Date, n: number) {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  c.setDate(c.getDate() + n);
  return c;
}

async function tryApi(options: FetchMyBookingsOptions): Promise<FetchMyBookingsResponse | null> {
  const { token, limit = 20, cursor, scope = 'future', status, endpoint } = options;
  const base = endpoint || '/api/bookings/me';

  // Translate scope into from/to/order query to align with backend proposal
  const params = new URLSearchParams();
  params.set('limit', String(Math.min(Math.max(limit, 1), 100)));
  if (cursor) params.set('cursor', cursor);
  if (status && status !== 'ALL' && status !== 'NONE') params.set('status', status);

  const today = new Date();
  const todayStr = toDateKey(today);
  if (scope === 'future') {
    params.set('from', todayStr);
    params.set('order', 'asc');
  } else if (scope === 'past') {
    const yday = addDays(today, -1);
    params.set('to', toDateKey(yday));
    params.set('order', 'desc');
  }

  const url = `${base}?${params.toString()}`;
  try {
    const res = await fetch(url, { headers: buildHeaders(token), cache: 'no-store' });
    if (!res.ok) {
      // Treat 404 as not implemented → fallback to stub
      if (res.status === 404) return null;
      const err = new Error(`HTTP ${res.status}`);
      (err as any).status = res.status;
      throw err;
    }
    const data = (await res.json()) as FetchMyBookingsResponse;
    if (!data || !Array.isArray(data.items)) return { items: [] };
    return { items: data.items, nextCursor: (data as any).nextCursor ?? null };
  } catch (e: any) {
    // Network errors → fallback to stub
    return null;
  }
}

function seededRandom(seed: number) {
  // Simple LCG for deterministic pseudo-random based on userId hash
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h);
}

function toDomainStatus(item: BookingItem, isPast: boolean): 'ATTIVA' | 'CANCELLATA' | 'PASSATA' {
  const st = (item.status || '').toUpperCase();
  if (st === 'CANCELLED' || st === 'CANCELED' || st === 'CANCELLATA') return 'CANCELLATA';
  if (isPast) return 'PASSATA';
  return 'ATTIVA';
}

function makeStubData(scope: Scope, userId?: string, limit = 20, cursor?: string | null, status?: StatusFilter): FetchMyBookingsResponse {
  const seed = hashString(userId || 'guest');
  const rnd = seededRandom(seed);

  const baseToday = new Date();

  // Generate a pool of 24 bookings around today (-10..+13 days)
  const pool: BookingItem[] = [];
  for (let i = -10; i <= 13; i++) {
    const d = addDays(baseToday, i);
    const date = toDateKey(d);
    const deskId = String(1 + Math.floor(rnd() * 12));
    const status: BookingStatus = rnd() < 0.1 ? 'CANCELLED' : rnd() < 0.6 ? 'CONFIRMED' : 'PENDING';
    const hasTimes = rnd() < 0.35;
    let startTime: string | null = null;
    let endTime: string | null = null;
    if (hasTimes) {
      const startHour = 8 + Math.floor(rnd() * 4); // 8..11
      const durationH = 6 + Math.floor(rnd() * 3); // 6..8h
      startTime = `${pad(startHour)}:${rnd() < 0.5 ? '00' : '30'}`;
      const endHour = Math.min(19, startHour + durationH);
      endTime = `${pad(endHour)}:${rnd() < 0.5 ? '00' : '30'}`;
    }
    pool.push({
      id: `${date}:${deskId}`,
      deskId,
      deskName: `Postazione ${deskId}`,
      date,
      status,
      startTime,
      endTime,
      locationName: rnd() < 0.3 ? 'Piano 1 - Open Space' : 'Piano 2 - Sala A',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const today = toDateKey(baseToday);
  let items = pool;
  if (scope === 'future') {
    items = items.filter(x => x.date >= today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id)));
  } else if (scope === 'past') {
    items = items.filter(x => x.date < today).sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : a.id.localeCompare(b.id) * -1));
  } else {
    items = items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id)));
  }

  // Optional status filter
  if (status && status !== 'ALL' && status !== 'NONE') {
    const want = status;
    const isPastList = scope === 'past';
    items = items.filter(it => toDomainStatus(it, isPastList) === want);
  }

  // Simple cursor as base64 of index; decode if provided
  let startIndex = 0;
  if (cursor) {
    try {
      const n = Number(atob(cursor));
      if (!isNaN(n) && n >= 0) startIndex = n;
    } catch {}
  }
  const page = items.slice(startIndex, startIndex + limit);
  const next = startIndex + limit < items.length ? btoa(String(startIndex + limit)) : null;
  return { items: page, nextCursor: next };
}

export async function fetchMyBookings(options: FetchMyBookingsOptions = {}): Promise<FetchMyBookingsResponse> {
  const api = await tryApi(options);
  if (api) return api;
  // Fallback to stub
  const { scope = 'future', userId, limit = 20, cursor, status } = options;
  return makeStubData(scope, userId, limit, cursor, status);
}
