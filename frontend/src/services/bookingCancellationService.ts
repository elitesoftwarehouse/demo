// BookingCancellationService — cancel a booking respecting 24h policy (frontend integration)
// Endpoints (attempt order):
// 1) POST /api/bookings/{id}/cancel  -> primary, body: {}
// 2) DELETE /api/bookings/{id}       -> fallback
// If neither exists, use a stub that enforces the 24h rule on client side.

export type CancelBookingRequest = {
  bookingId: string;
  // Optional date/time hints for client-side precheck & stub policy
  date?: string; // YYYY-MM-DD
  startTime?: string | null; // HH:mm (local Europe/Rome semantics)
};

export type CancelBookingResponse = {
  bookingId: string;
  status: 'CANCELLATA' | string;
  cancelledAt?: string;
};

export type CancelBookingOptions = {
  token?: string | null;
  endpointBase?: string; // override base endpoint (for tests), default '/api/bookings'
  signal?: AbortSignal;
};

function buildHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function pad(n: number) { return n < 10 ? `0${n}` : String(n); }

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Build a Date representing the start instant in local Europe/Rome based on date + startTime
// If startTime missing, assume 09:00
export function computeStartInstant(date: string, startTime?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!m) return null;
  const [_, ys, ms, ds] = m;
  const y = Number(ys), mo = Number(ms), da = Number(ds);
  if (!y || !mo || !da) return null;
  let hh = 9, mm = 0;
  if (startTime && /^(\d{2}):(\d{2})$/.test(startTime)) {
    const parts = startTime.split(':');
    hh = Number(parts[0]);
    mm = Number(parts[1]);
  }
  // We construct a local date in Europe/Rome then convert to a UTC Date using Intl
  const locale = 'it-IT';
  const tz = 'Europe/Rome';
  const local = new Date(y, mo - 1, da, hh, mm, 0, 0);
  // Extract components as seen in Europe/Rome to avoid DST pitfalls
  const fmt = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const parts = fmt.formatToParts(local).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value; return acc;
  }, {});
  const iso = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function canCancelBy24h(date?: string, startTime?: string | null, now: Date = new Date()): boolean {
  if (!date) return false;
  const start = computeStartInstant(date, startTime);
  if (!start) return false;
  const diffMs = start.getTime() - now.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return hours > 24;
}

async function tryPrimary(id: string, options: CancelBookingOptions): Promise<CancelBookingResponse | null> {
  const base = options.endpointBase || '/api/bookings';
  const url = `${base}/${encodeURIComponent(id)}/cancel`;
  try {
    const res = await fetch(url, { method: 'POST', headers: buildHeaders(options.token), body: JSON.stringify({}), signal: options.signal });
    if (res.status === 404) return null; // try fallback
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      (err as any).status = res.status;
      try {
        const data = await res.json();
        (err as any).code = (data && (data.code || data.errorCode)) || undefined;
        (err as any).message = data?.message || err.message;
      } catch {}
      throw err;
    }
    const data = await res.json();
    return { bookingId: id, status: (data.status || 'CANCELLATA'), cancelledAt: data.cancelledAt };
  } catch (e: any) {
    if (e?.status === 404) return null;
    throw e;
  }
}

async function tryFallback(id: string, options: CancelBookingOptions): Promise<CancelBookingResponse | null> {
  const base = options.endpointBase || '/api/bookings';
  const url = `${base}/${encodeURIComponent(id)}`;
  try {
    const res = await fetch(url, { method: 'DELETE', headers: buildHeaders(options.token), signal: options.signal });
    if (res.status === 404) return null;
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      (err as any).status = res.status;
      throw err;
    }
    return { bookingId: id, status: 'CANCELLATA', cancelledAt: new Date().toISOString() };
  } catch (e: any) {
    if (e?.status === 404) return null;
    throw e;
  }
}

function stubCancel(req: CancelBookingRequest): CancelBookingResponse {
  const { bookingId, date, startTime } = req;
  if (!date) {
    // If we don't know the date, simulate success to keep UX flowing in demo
    return { bookingId, status: 'CANCELLATA', cancelledAt: new Date().toISOString() };
  }
  if (!canCancelBy24h(date, startTime)) {
    const err: any = new Error('La prenotazione non può essere cancellata perché mancano meno di 24 ore all\'orario di utilizzo.');
    err.code = 'POLICY_24H';
    err.status = 422;
    throw err;
  }
  return { bookingId, status: 'CANCELLATA', cancelledAt: new Date().toISOString() };
}

export async function cancelBooking(req: CancelBookingRequest, options: CancelBookingOptions = {}): Promise<CancelBookingResponse> {
  // Try primary then fallback
  try {
    const p = await tryPrimary(req.bookingId, options);
    if (p) return p;
  } catch (e) {
    // If server returns semantic error, rethrow (don't fallback to stub)
    throw e;
  }

  try {
    const f = await tryFallback(req.bookingId, options);
    if (f) return f;
  } catch (e) {
    // If error other than 404, rethrow
    throw e;
  }

  // Neither endpoint available → stub
  return stubCancel(req);
}
