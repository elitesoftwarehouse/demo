import React from 'react';
import { StationStatus, StationStatusDTO, fetchStationsStatus } from '../services/stationsService';

export type Station = {
  id: string;
  name: string;
  status: StationStatus;
};

export type UseStationsOptions = {
  token?: string | null;
  intervalMs?: number; // default 30000
  debounceMs?: number; // default 300
};

export function useStationsPolling({ token, intervalMs = 30000, debounceMs = 300 }: UseStationsOptions) {
  const [stations, setStations] = React.useState<Station[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Track in-flight to avoid duplicate rapid requests
  const inFlightRef = React.useRef(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const debounceRef = React.useRef<number | null>(null);

  const clearTimers = React.useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const cancelInFlight = React.useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    inFlightRef.current = false;
  }, []);

  const normalize = React.useCallback((list: StationStatusDTO[]): Station[] => {
    const items = list.map((d, idx) => ({
      id: String(d.id ?? idx),
      name: String(d.name ?? `Postazione ${idx + 1}`),
      status: (d.status === 'FREE' || d.status === 'OCCUPIED' || d.status === 'UNAVAILABLE') ? d.status : 'UNAVAILABLE',
    }));

    // Ensure 12 items, padding as UNAVAILABLE if needed
    const arr = items.slice(0, 12);
    while (arr.length < 12) {
      arr.push({ id: `placeholder-${arr.length}`, name: `Postazione ${arr.length + 1}`, status: 'UNAVAILABLE' });
    }
    return arr;
  }, []);

  const load = React.useCallback(async () => {
    if (inFlightRef.current) {
      return; // avoid duplicate
    }
    inFlightRef.current = true;
    setError(null);

    const ac = new AbortController();
    abortRef.current = ac;
    try {
      if (!loading) setLoading(true);
      const data = await fetchStationsStatus({ token, signal: ac.signal });
      setStations(normalize(data));
    } catch (e: any) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // ignore
      } else {
        setError('Impossibile recuperare le postazioni. Controlla la connessione.');
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [token, normalize, loading]);

  const scheduleLoad = React.useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void load();
    }, debounceMs);
  }, [load, debounceMs]);

  const startPolling = React.useCallback(() => {
    clearTimers();
    void load();
    timerRef.current = window.setInterval(() => {
      void load();
    }, intervalMs);
  }, [load, intervalMs, clearTimers]);

  const stop = React.useCallback(() => {
    clearTimers();
    cancelInFlight();
  }, [clearTimers, cancelInFlight]);

  React.useEffect(() => {
    startPolling();
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, intervalMs]);

  return {
    stations,
    loading,
    error,
    reload: load,
    scheduleReload: scheduleLoad,
    stop,
  };
}
