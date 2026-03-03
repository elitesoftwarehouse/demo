import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// SelectedDateContext: single source of truth for the currently selected date across pages
// - Normalizes to date-only (local timezone)
// - Syncs with URL query param `date=YYYY-MM-DD` to support deep-link and refresh
// - Defaults to today if not specified

export type SelectedDateContextValue = {
  date: Date;
  setDate: (d: Date) => void;
  dateKey: string; // YYYY-MM-DD
};

const SelectedDateContext = React.createContext<SelectedDateContextValue | undefined>(undefined);

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateKey(key: string): Date | null {
  // Expect YYYY-MM-DD
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (!y || !mo || !da) return null;
  const d = new Date(y, mo - 1, da);
  // Validate round-trip
  if (d.getFullYear() !== y || d.getMonth() + 1 !== mo || d.getDate() !== da) return null;
  return d;
}

function startOfDayLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const SelectedDateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlKey = searchParams.get('date');

  const initial = React.useMemo(() => {
    const parsed = urlKey ? fromDateKey(urlKey) : null;
    return startOfDayLocal(parsed || new Date());
  }, [urlKey]);

  const [date, setDate] = React.useState<Date>(initial);

  // Keep state in sync if the URL query param changes externally (e.g., back/forward navigation)
  React.useEffect(() => {
    const currentKey = toDateKey(date);
    const urlKeyNow = (new URLSearchParams(location.search)).get('date');
    if (urlKeyNow && urlKeyNow !== currentKey) {
      const parsed = fromDateKey(urlKeyNow);
      if (parsed) setDate(startOfDayLocal(parsed));
    }
    if (!urlKeyNow) {
      // No date in URL -> do nothing here; outbound effect will add it
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Push current date to URL if missing or different
  React.useEffect(() => {
    const currentKey = toDateKey(date);
    const params = new URLSearchParams(location.search);
    const urlKeyNow = params.get('date');
    if (urlKeyNow === currentKey) return; // already up to date
    params.set('date', currentKey);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [date, location.pathname, location.search, navigate]);

  const value = React.useMemo<SelectedDateContextValue>(() => ({
    date,
    setDate: (d: Date) => setDate(startOfDayLocal(d)),
    dateKey: toDateKey(date),
  }), [date]);

  return (
    <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>
  );
};

export function useSelectedDate(): SelectedDateContextValue {
  const ctx = React.useContext(SelectedDateContext);
  if (!ctx) throw new Error('useSelectedDate must be used within SelectedDateProvider');
  return ctx;
}
