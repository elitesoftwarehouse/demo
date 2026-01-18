import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Shared selected date context to preserve temporal context across routes
// Format: YYYY-MM-DD (local date)

export interface SelectedDateState {
  date: string; // ISO local date (YYYY-MM-DD)
  setDate: (date: string) => void;
  resetToToday: () => void;
}

const SelectedDateContext = createContext<SelectedDateState | undefined>(undefined);

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isValidDateParam(v: string | null): v is string {
  if (!v) return false;
  // Basic YYYY-MM-DD validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  // Ensure parsed date matches (to avoid timezone issues, compare components)
  const parts = v.split('-').map((x) => parseInt(x, 10));
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y === parts[0] && m === parts[1] && day === parts[2];
}

function getUrlDate(): string | null {
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get('date');
    return isValidDateParam(v) ? v : null;
  } catch {
    return null;
  }
}

function setUrlDate(date: string) {
  try {
    const url = new URL(window.location.href);
    if (date) {
      url.searchParams.set('date', date);
    } else {
      url.searchParams.delete('date');
    }
    // Use replaceState to avoid polluting history for every date change
    window.history.replaceState({}, '', url.toString());
  } catch {
    // noop
  }
}

export const SelectedDateProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [date, setDateState] = useState<string>(() => getUrlDate() || formatDate(new Date()));

  const setDate = useCallback((d: string) => {
    setDateState(d);
    setUrlDate(d);
  }, []);

  const resetToToday = useCallback(() => {
    const today = formatDate(new Date());
    setDate(today);
  }, [setDate]);

  // Keep state in sync when navigating with back/forward buttons
  useEffect(() => {
    const onPopState = () => {
      const fromUrl = getUrlDate();
      if (fromUrl && fromUrl !== date) {
        setDateState(fromUrl);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [date]);

  // Ensure initial URL has date param for deep-link consistency
  useEffect(() => {
    if (!getUrlDate()) {
      setUrlDate(date);
    }
    // run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<SelectedDateState>(() => ({ date, setDate, resetToToday }), [date, setDate, resetToToday]);

  return <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>;
};

export function useSelectedDate(): SelectedDateState {
  const ctx = useContext(SelectedDateContext);
  if (!ctx) throw new Error('useSelectedDate must be used within SelectedDateProvider');
  return ctx;
}
