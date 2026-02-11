import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchDeskStatuses, type DeskStatusItem, type DeskStatus } from '../../api/desksClient';
import { addBookingCreatedListener, type BookingCreatedDetail } from '../../events/bookingEvents';

export type Desk = {
  id: string; // D01..D12
  name: string; // es. "Postazione D01"
  x: number; // percent 0..100
  y: number; // percent 0..100
  status: DeskStatus;
};

export const defaultDesks: Desk[] = [
  { id: 'D01', name: 'Postazione D01', x: 10, y: 15, status: 'free' },
  { id: 'D02', name: 'Postazione D02', x: 40, y: 15, status: 'busy' },
  { id: 'D03', name: 'Postazione D03', x: 70, y: 15, status: 'unavailable' },
  { id: 'D04', name: 'Postazione D04', x: 10, y: 40, status: 'free' },
  { id: 'D05', name: 'Postazione D05', x: 40, y: 40, status: 'busy' },
  { id: 'D06', name: 'Postazione D06', x: 70, y: 40, status: 'unavailable' },
  { id: 'D07', name: 'Postazione D07', x: 10, y: 65, status: 'free' },
  { id: 'D08', name: 'Postazione D08', x: 40, y: 65, status: 'busy' },
  { id: 'D09', name: 'Postazione D09', x: 70, y: 65, status: 'unavailable' },
  { id: 'D10', name: 'Postazione D10', x: 10, y: 85, status: 'free' },
  { id: 'D11', name: 'Postazione D11', x: 40, y: 85, status: 'busy' },
  { id: 'D12', name: 'Postazione D12', x: 70, y: 85, status: 'unavailable' },
];

export type UseDesksDataOptions = {
  baseUrl?: string;
  pollingMs?: number; // default 30000
  // Optional selected date (YYYY-MM-DD) to scope real-time updates.
  date?: string;
};

export type UseDesksData = {
  desks: Desk[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
};

function mergeStatuses(layout: Desk[], statuses: DeskStatusItem[]): Desk[] {
  const map = new Map(statuses.map((s) => [s.id, s] as const));
  return layout.map((d) => {
    const found = map.get(d.id);
    if (!found) return d;
    const status: DeskStatus = found.status as DeskStatus;
    const name = found.name || d.name;
    const x = typeof found.x === 'number' ? found.x : d.x;
    const y = typeof found.y === 'number' ? found.y : d.y;
    return { ...d, status, name, x, y };
  });
}

export function useDesksData(opts?: UseDesksDataOptions): UseDesksData {
  const baseUrl = opts?.baseUrl || '/api';
  const pollingMs = opts?.pollingMs ?? 30000;
  const selectedDate = opts?.date; // YYYY-MM-DD

  const [desks, setDesks] = useState<Desk[]>(defaultDesks);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const pendRef = useRef<boolean>(false); // prevent duplicate concurrent fetches (debounce)
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const doFetch = useCallback(async () => {
    if (pendRef.current) return; // avoid duplicate trigger
    pendRef.current = true;
    setLoading(true);
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const api = await fetchDeskStatuses({ baseUrl, signal: ctrl.signal });
      if (!mountedRef.current) return;
      setDesks((prev) => mergeStatuses(prev.length ? prev : defaultDesks, api));
      setLastUpdated(new Date());
    } catch (e: any) {
      if (!mountedRef.current) return;
      if (e?.name === 'AbortError') return; // ignore abortion
      setError(e?.message || 'desk_status.fetch_failed');
    } finally {
      if (mountedRef.current) setLoading(false);
      pendRef.current = false;
    }
  }, [baseUrl]);

  // Initial fetch
  useEffect(() => {
    doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]);

  // Polling interval
  useEffect(() => {
    if (!pollingMs || pollingMs <= 0) return;
    const id = setInterval(() => {
      // Skip if a previous request is still pending to avoid pile-up
      if (!pendRef.current) doFetch();
    }, pollingMs);
    return () => clearInterval(id);
  }, [doFetch, pollingMs]);

  // Real-time local update after booking created
  useEffect(() => {
    // Listen and optimistically set a desk to busy when booking is created for selected date
    const remove = addBookingCreatedListener((detail: BookingCreatedDetail) => {
      if (!mountedRef.current) return;
      // If a date filter exists, only update for matching date
      if (selectedDate && detail.date !== selectedDate) return;
      setDesks((prev) =>
        prev.map((d) => (d.id === detail.deskId ? { ...d, status: 'busy' as DeskStatus } : d)),
      );
    });
    return () => remove();
  }, [selectedDate]);

  const refresh = useCallback(async () => {
    await doFetch();
  }, [doFetch]);

  return useMemo(
    () => ({ desks, loading, error, lastUpdated, refresh }),
    [desks, loading, error, lastUpdated, refresh],
  );
}
