export type BookingsClientOptions = { baseUrl?: string };
export type UserBookingItemDto = {
  id: string;
  startDate: string; // ISO 8601 date (YYYY-MM-DD) or full datetime
  endDate: string | null; // null for date-only bookings
  deskId: string;
  status: string; // keep as string for UI
  // New optional explicit booking state from backend (e.g., PASSATA | ATTIVA | CANCELLATA)
  state?: string | null;
  notes?: string | null;
  tags?: string[] | null;
};

export type ListMyBookingsResponse = {
  items: UserBookingItemDto[];
  page: number;
  size: number;
  total?: number; // optional for backward compat
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
};

async function safeJson(res: Response): Promise<any | null> {
  try { return await res.json(); } catch { return null; }
}

export async function listMyBookings(
  params: { page?: number; size?: number; status?: 'ATTIVA' | 'PASSATA' | 'CANCELLATA' | 'ALL' } = {},
  opts?: BookingsClientOptions,
  accessToken?: string,
): Promise<ListMyBookingsResponse> {
  const base = opts?.baseUrl || '/api';
  const page = params.page ?? 1;
  const size = params.size ?? 20;
  const status = params.status || 'ALL';
  const qs = new URLSearchParams({ page: String(page), size: String(size), status });
  const res = await fetch(`${base}/bookings/my?${qs.toString()}` , {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  if (!res.ok) {
    const data = await safeJson(res);
    const err = new Error(data?.error || `bookings.list_failed_${res.status}`);
    throw err;
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    return { items: data as UserBookingItemDto[], page, size, hasNext: (data as any[]).length === size };
    }
  return data as ListMyBookingsResponse;
}

// Cancel a booking owned by the current user
// Server-side will enforce 24h cutoff; client uses this to trigger the action
export async function cancelMyBooking(
  bookingId: string,
  opts?: BookingsClientOptions,
  accessToken?: string,
): Promise<{ ok: boolean; item?: UserBookingItemDto | null; message?: string }>{
  const base = opts?.baseUrl || '/api';
  const res = await fetch(`${base}/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({}),
  });
  const data = await safeJson(res);
  if (!res.ok) {
    const err = new Error(data?.error || `bookings.cancel_failed_${res.status}`);
    (err as any).details = data?.details;
    throw err;
  }
  // Expect either { ok: true } or updated item payload
  return {
    ok: true,
    item: (data && (data.item || data.booking)) ?? null,
    message: data?.message,
  };
}
