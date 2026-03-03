// Service client for fetching disabled dates from backend calendar API
// Endpoint: GET /api/calendar/disabled-dates?from=YYYY-MM-DD&to=YYYY-MM-DD

export type DisabledDatesResponse = {
  disabledDates: string[]; // ISO date-only strings (YYYY-MM-DD)
};

export async function fetchDisabledDates(options: {
  from: string; // inclusive
  to: string;   // inclusive
  token?: string | null;
  signal?: AbortSignal;
  endpoint?: string; // override for tests
}): Promise<string[]> {
  const { from, to, token, signal, endpoint } = options;
  const base = endpoint || '/api/calendar/disabled-dates';
  const url = `${base}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers, signal, cache: 'no-store' });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  const data = (await res.json()) as DisabledDatesResponse;
  if (!data || !Array.isArray(data.disabledDates)) return [];
  return data.disabledDates;
}
