import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { DeskStatus } from './desksApi';

// Utilities
function toDateKey(input?: Date | string): string {
  if (!input) {
    const d = new Date();
    const iso = d.toISOString();
    return iso.substring(0, 10);
  }
  if (typeof input === 'string') {
    // If already in YYYY-MM-DD format, trust it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const d = new Date(input);
    const iso = d.toISOString();
    return iso.substring(0, 10);
  }
  const iso = input.toISOString();
  return iso.substring(0, 10);
}

// Types
export type DeskId = string;
export type DateKey = string; // YYYY-MM-DD
export type DeskOverrides = Record<DeskId, DeskStatus>;
export type OverridesByDate = Record<DateKey, DeskOverrides>;

interface DesksStateValue {
  // Read
  getOverridesForDate: (date?: Date | string) => DeskOverrides;
  // Write
  setDeskStatus: (deskId: DeskId, status: DeskStatus, date?: Date | string) => void;
  clearDate: (date?: Date | string) => void;
  reset: () => void;
  // Helpers
  markBookedOptimistic: (
    deskId: DeskId,
    date?: Date | string
  ) => { rollback: () => void };
}

const DesksStateContext = createContext<DesksStateValue | null>(null);

export const DesksStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overrides, setOverrides] = useState<OverridesByDate>({});

  const getOverridesForDate = useCallback(
    (date?: Date | string): DeskOverrides => {
      const key = toDateKey(date);
      return overrides[key] || {};
    },
    [overrides]
  );

  const setDeskStatus = useCallback((deskId: DeskId, status: DeskStatus, date?: Date | string) => {
    const key = toDateKey(date);
    setOverrides((prev) => {
      const current = prev[key] || {};
      return { ...prev, [key]: { ...current, [deskId]: status } };
    });
  }, []);

  const clearDate = useCallback((date?: Date | string) => {
    const key = toDateKey(date);
    setOverrides((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev } as OverridesByDate;
      delete next[key];
      return next;
    });
  }, []);

  const reset = useCallback(() => setOverrides({}), []);

  const markBookedOptimistic = useCallback((deskId: DeskId, date?: Date | string) => {
    const key = toDateKey(date);
    const before = overrides[key]?.[deskId];
    // Set to OCCUPIED optimistically
    setDeskStatus(deskId, 'OCCUPIED' as DeskStatus, key);
    // Provide rollback in case API fails
    const rollback = () => {
      setOverrides((prev) => {
        const cur = prev[key] || {};
        if (typeof before === 'undefined') {
          const { [deskId]: _, ...rest } = cur;
          return { ...prev, [key]: rest };
        }
        return { ...prev, [key]: { ...cur, [deskId]: before } };
      });
    };
    return { rollback };
  }, [overrides, setDeskStatus]);

  const value = useMemo<DesksStateValue>(() => ({
    getOverridesForDate,
    setDeskStatus,
    clearDate,
    reset,
    markBookedOptimistic,
  }), [getOverridesForDate, setDeskStatus, clearDate, reset, markBookedOptimistic]);

  return <DesksStateContext.Provider value={value}>{children}</DesksStateContext.Provider>;
};

// Hooks
export function useDesksState(): DesksStateValue {
  const ctx = useContext(DesksStateContext);
  if (!ctx) {
    // Provide a graceful fallback if provider is missing
    return {
      getOverridesForDate: () => ({}),
      setDeskStatus: () => undefined,
      clearDate: () => undefined,
      reset: () => undefined,
      markBookedOptimistic: () => ({ rollback: () => undefined }),
    };
  }
  return ctx;
}

export function useDeskOverrides(date?: Date | string): DeskOverrides {
  const { getOverridesForDate } = useDesksState();
  return getOverridesForDate(date);
}

export function useDesksActions() {
  const { setDeskStatus, markBookedOptimistic, clearDate, reset } = useDesksState();
  return { setDeskStatus, markBookedOptimistic, clearDate, reset };
}
