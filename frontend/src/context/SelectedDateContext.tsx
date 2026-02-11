import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type SelectedDateContextValue = {
  date: string; // YYYY-MM-DD
  setDate: (next: string | Date) => void;
};

const SelectedDateContext = createContext<SelectedDateContextValue | undefined>(undefined);

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const [y, m, d] = s.split('-').map((p) => parseInt(p, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Ensure normalization keeps same date components
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}

export const SelectedDateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize with URL ?date=... if present, else today
  const initialDate = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const q = params.get('date');
    if (q && isValidYmd(q)) return q;
    return toYmd(new Date());
  }, []); // compute once on mount

  const [date, setDateState] = useState<string>(initialDate);

  const setDate = useCallback((next: string | Date) => {
    const nextStr = typeof next === 'string' ? next : toYmd(next);
    if (!isValidYmd(nextStr)) return; // ignore invalid
    setDateState((prev) => (prev === nextStr ? prev : nextStr));
  }, []);

  // Keep URL in sync with current selected date and current pathname
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const current = params.get('date');
    if (current === date) return;
    params.set('date', date);
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
  }, [date, location.pathname]);

  // If user navigates with a different date in the URL (e.g., from external link), update state
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const q = params.get('date');
    if (q && isValidYmd(q) && q !== date) {
      setDateState(q);
    }
    // If no date in URL, we don't reset state to preserve current selection across routes
  }, [location.search]);

  const value = useMemo(() => ({ date, setDate }), [date, setDate]);

  return <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>;
};

export function useSelectedDate(): SelectedDateContextValue {
  const ctx = useContext(SelectedDateContext);
  if (!ctx) throw new Error('useSelectedDate must be used within SelectedDateProvider');
  return ctx;
}
