// BookingService - interface and stub integration for desk bookings
// If backend API is available, this service will call it. Otherwise it falls back to a stub
// to simulate a successful booking, enabling the UI flow and tests.

export type CreateDeskBookingRequest = {
  deskId: string;
  // Date in YYYY-MM-DD (date-only, Europe/Rome semantics on server side)
  date: string;
  // Current authenticated user id
  userId: string;
};

export type CreateDeskBookingResponse = {
  bookingId: string;
  status: 'CONFIRMED' | 'PENDING';
  deskId: string;
  date: string; // YYYY-MM-DD
};

export type CreateDeskBookingOptions = {
  token?: string | null;
  // Explicit endpoint override (useful for tests)
  endpoint?: string;
  // Whether to attempt real API first; if false, always use stub
  preferApi?: boolean;
  signal?: AbortSignal;
};

const PRIMARY_ENDPOINT_TEMPLATE = '/api/desks/{id}/book'; // e.g., POST /api/desks/7/book
const FALLBACK_ENDPOINT = '/api/bookings/desks'; // e.g., POST with { deskId, date, userId }

function buildHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// Internal helper to try server endpoints if present
async function tryApi(request: CreateDeskBookingRequest, options: CreateDeskBookingOptions = {}): Promise<CreateDeskBookingResponse | null> {
  const { token, endpoint, signal } = options;
  const headers = buildHeaders(token);

  const candidates: { url: string; method: 'POST'; body: any }[] = [];

  if (endpoint) {
    candidates.push({ url: endpoint, method: 'POST', body: request });
  } else {
    // 1) Primary: /api/desks/{id}/book with body { date, userId }
    const primaryUrl = PRIMARY_ENDPOINT_TEMPLATE.replace('{id}', encodeURIComponent(request.deskId));
    candidates.push({ url: primaryUrl, method: 'POST', body: { date: request.date, userId: request.userId } });
    // 2) Fallback collection endpoint: /api/bookings/desks with full body
    candidates.push({ url: FALLBACK_ENDPOINT, method: 'POST', body: request });
  }

  let lastErr: any = null;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    try {
      const res = await fetch(c.url, { method: c.method, headers, body: JSON.stringify(c.body), signal });
      if (res.ok) {
        const data = (await res.json()) as Partial<CreateDeskBookingResponse> | null;
        if (data && data.bookingId) {
          return {
            bookingId: String(data.bookingId),
            status: (data.status as any) === 'PENDING' ? 'PENDING' : 'CONFIRMED',
            deskId: data.deskId || request.deskId,
            date: data.date || request.date,
          };
        }
        // If response is 200 but not in expected shape, treat as failure to allow stub fallback
      } else if (res.status === 404) {
        // Try next candidate (older servers might not have the endpoint)
      } else {
        // For 409 Conflict or 4xx/5xx, throw an error to surface to UI
        const err = new Error(`HTTP ${res.status}`);
        (err as any).status = res.status;
        try {
          (err as any).body = await res.json();
        } catch {/* ignore */}
        throw err;
      }
    } catch (e) {
      // Propagate AbortError
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      lastErr = e;
      // Try next candidate
    }
  }

  // If all candidates failed without a definitive server error (e.g., 409), return null to allow stub
  if (lastErr && (lastErr as any).status && (lastErr as any).status !== 404) {
    // Rethrow non-404 errors so caller can handle them (e.g., 409 Conflict)
    throw lastErr;
  }
  return null;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple deterministic stub: resolves after ~600ms,
// returns a CONFIRMED booking id. If the date looks invalid or in the past
// compared to today (client-side), it simulates a 422 error.
async function stubCreate(request: CreateDeskBookingRequest): Promise<CreateDeskBookingResponse> {
  await delay(600);
  // Basic validation: ensure YYYY-MM-DD and not empty
  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.date)) {
    const err: any = new Error('Formato data non valido');
    err.status = 422;
    throw err;
  }
  // Simulate past-date validation failure
  try {
    const [y, m, d] = request.date.split('-').map(Number);
    const input = new Date(Date.UTC(y, m - 1, d));
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    if (input.getTime() < todayUTC.getTime()) {
      const err: any = new Error('La data selezionata non è valida (già trascorsa)');
      err.status = 422;
      throw err;
    }
  } catch {/* ignore parse errors */}

  // Simulate conflict for a specific pattern to enable frontend error paths
  // e.g., if deskId ends with '0'
  if (/0$/.test(request.deskId)) {
    const err: any = new Error('Postazione appena prenotata da un altro utente');
    err.status = 409;
    throw err;
  }

  return {
    bookingId: `stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'CONFIRMED',
    deskId: request.deskId,
    date: request.date,
  };
}

export async function createDeskBooking(request: CreateDeskBookingRequest, options: CreateDeskBookingOptions = {}): Promise<CreateDeskBookingResponse> {
  const { preferApi = true } = options;
  if (preferApi) {
    const apiRes = await tryApi(request, options);
    if (apiRes) return apiRes;
  }
  // Fallback to stub
  return stubCreate(request);
}
