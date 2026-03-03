import React from 'react';
import { fetchDisabledDates } from '../services/calendarService';
import { useAuth } from '../context/AuthContext';

// Minimal, dependency-free date picker implementation with month navigation
// It supports disabling dates via API and Sunday blocking fallback.
// NOTE: In a real app you'd likely use a UI library (MUI/React Datepicker). Here we create
// a simple accessible calendar for the demo purposes.

export type DatePickerWithDisabledProps = {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  // Optional min/max selectable bounds (date-only)
  minDate?: Date;
  maxDate?: Date;
  // Optional: initial month to show; defaults to value or today
  initialMonth?: Date;
  // i18n labels
  labels?: {
    monthPrev?: string;
    monthNext?: string;
    legendTitle?: string;
    legendHoliday?: string;
    legendSunday?: string;
  };
};

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${y}-${pad(m)}-${pad(day)}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const DatePickerWithDisabled: React.FC<DatePickerWithDisabledProps> = ({
  value = null,
  onChange,
  minDate,
  maxDate,
  initialMonth,
  labels,
}) => {
  const { tokens } = useAuth();
  const accessToken = tokens?.accessToken;

  const initial = React.useMemo(() => {
    return startOfMonth(initialMonth || value || new Date());
  }, [initialMonth, value]);

  const [month, setMonth] = React.useState<Date>(initial);
  const [disabledSet, setDisabledSet] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);

  const computeRange = React.useCallback((m: Date) => {
    const from = startOfMonth(m);
    const to = endOfMonth(m);
    // Expand range by a small buffer (prev/next few days) to avoid flickers when navigating
    const fromBuf = new Date(from.getFullYear(), from.getMonth(), from.getDate() - 3);
    const toBuf = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 3);
    return { from: fromBuf, to: toBuf };
  }, []);

  const loadDisabled = React.useCallback(async (m: Date) => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const { from, to } = computeRange(m);
    const fromKey = toDateKey(from);
    const toKey = toDateKey(to);
    setLoading(true);
    setError(null);
    try {
      const list = await fetchDisabledDates({ from: fromKey, to: toKey, token: accessToken, signal: ac.signal });
      // Also mark all Sundays as disabled (fallback safety)
      const set = new Set<string>();
      for (let d = new Date(from); d <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        if (d.getDay() === 0) set.add(toDateKey(d)); // Sunday
      }
      for (const s of list) set.add(s);
      setDisabledSet(set);
    } catch (e: any) {
      // Fallback: disable everything and show error message
      const set = new Set<string>();
      const today = new Date();
      const end = endOfMonth(m);
      for (let d = new Date(m.getFullYear(), m.getMonth(), 1); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        set.add(toDateKey(d));
      }
      setDisabledSet(set);
      setError('Impossibile caricare i giorni disponibili. Riprova più tardi.');
      console.error('[datepicker] disabled-dates API failed', e);
    } finally {
      setLoading(false);
    }
  }, [accessToken, computeRange]);

  React.useEffect(() => {
    void loadDisabled(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month.getFullYear(), month.getMonth()]);

  const goPrev = () => setMonth(prev => addMonths(prev, -1));
  const goNext = () => setMonth(prev => addMonths(prev, 1));

  const handleSelect = (d: Date) => {
    if (onChange) onChange(d);
  };

  const isWithinBounds = (d: Date) => {
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return false;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return false;
    return true;
  };

  const isDisabled = (d: Date) => {
    const key = toDateKey(d);
    if (disabledSet.has(key)) return true;
    // safety: sunday fallback if API did not provide
    if (d.getDay() === 0) return true;
    // bounds
    if (!isWithinBounds(d)) return true;
    return false;
  };

  const monthLabel = month.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  // Build grid starting on Monday
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // convert Sun=0..Sat=6 to Mon=0..Sun=6
  const daysInThisMonth = endOfMonth(month).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInThisMonth; d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  }

  const l = {
    monthPrev: 'Mese precedente',
    monthNext: 'Mese successivo',
    legendTitle: 'Legenda',
    legendHoliday: 'Festività/chiusura',
    legendSunday: 'Domenica',
    ...labels,
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" onClick={goPrev} aria-label={l.monthPrev}>&lt;</button>
        <strong aria-live="polite">{monthLabel}</strong>
        <button type="button" onClick={goNext} aria-label={l.monthNext}>&gt;</button>
      </div>

      {error && (
        <div style={{ background: '#fde8e8', color: '#611a15', padding: '0.5rem', borderRadius: 6, marginBottom: 8 }}>
          {error}
        </div>
      )}

      <div role="grid" aria-label="Calendario" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {weekdayLabels.map(w => (
          <div key={w} role="columnheader" aria-label={w} style={{ textAlign: 'center', fontSize: 12, color: '#6b7280' }}>{w}</div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`e-${idx}`} />;
          const disabled = isDisabled(cell);
          const isSelected = value && cell.toDateString() === value.toDateString();
          const isSunday = cell.getDay() === 0;
          const bg = disabled ? (isSunday ? '#f3f4f6' : '#fee2e2') : isSelected ? '#111827' : '#ffffff';
          const color = disabled ? '#9ca3af' : isSelected ? '#ffffff' : '#111827';
          return (
            <button
              key={cell.toISOString()}
              type="button"
              role="gridcell"
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => !disabled && handleSelect(cell)}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #e5e7eb', background: bg, color, cursor: disabled ? 'not-allowed' : 'pointer' }}
              title={disabled ? (isSunday ? l.legendSunday : l.legendHoliday) : ''}
            >
              {cell.getDate()}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden style={{ width: 12, height: 12, display: 'inline-block', borderRadius: 3, background: '#fee2e2', border: '1px solid #fecaca' }} />
          <span style={{ fontSize: 12 }}>{l.legendHoliday}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden style={{ width: 12, height: 12, display: 'inline-block', borderRadius: 3, background: '#f3f4f6', border: '1px solid #e5e7eb' }} />
          <span style={{ fontSize: 12 }}>{l.legendSunday}</span>
        </div>
      </div>

      {loading && (
        <div role="status" aria-live="polite" style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
          Caricamento giorni non prenotabili…
        </div>
      )}
    </div>
  );
};

export default DatePickerWithDisabled;
