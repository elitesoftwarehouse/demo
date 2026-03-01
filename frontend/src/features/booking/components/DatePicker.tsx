import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchDisabledDates } from '../../calendar/calendarApi';
import { isDateDisabledFactory, toIsoDate } from '../utils/dateUtils';

// Minimal, dependency-free date picker placeholder.
// In a real project you may wrap a UI library calendar that supports disabling dates.

export type DatePickerProps = {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  // Initially visible month (year, monthIndex 0-11)
  initialMonth?: { year: number; month: number };
  // Optional message renderer for disabled reasons
  renderLegend?: () => React.ReactNode;
};

function getStartOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}
function getEndOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, initialMonth, renderLegend }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(initialMonth?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialMonth?.month ?? today.getMonth());
  const [disabledSet, setDisabledSet] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = getStartOfMonth(viewYear, viewMonth);
  const end = getEndOfMonth(viewYear, viewMonth);

  // Load disabled dates whenever visible month changes
  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const fromIso = toIsoDate(start);
    const toIso = toIsoDate(end);

    (async () => {
      try {
        setError(null);
        const list = await fetchDisabledDates(fromIso, toIso, ctrl.signal);
        setDisabledSet(new Set(list));
      } catch (e: any) {
        console.error('Failed loading disabled dates', e);
        setError('Impossibile caricare i giorni non prenotabili.');
        // Conservative: if API fails, keep Sundays blocked via isDateDisabled
        setDisabledSet(new Set());
      }
    })();

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  const isDisabled = useMemo(() => isDateDisabledFactory(disabledSet), [disabledSet]);

  const handleSelect = (date: Date) => {
    if (isDisabled(date)) {
      // Optional UX: show a toast; here we just ignore selection
      return;
    }
    onChange?.(date);
  };

  const daysInMonth = end.getDate();
  const firstWeekday = start.getDay(); // 0=Sun .. 6=Sat

  const prevMonth = () => {
    let y = viewYear;
    let m = viewMonth - 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    setViewYear(y);
    setViewMonth(m);
  };
  const nextMonth = () => {
    let y = viewYear;
    let m = viewMonth + 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="datepicker" aria-label="Selettore data prenotazione">
      <div className="dp-header">
        <button className="icon-btn" onClick={prevMonth} aria-label="Mese precedente">◀</button>
        <div aria-live="polite" style={{ fontWeight: 600 }}>{monthLabel}</div>
        <button className="icon-btn" onClick={nextMonth} aria-label="Mese successivo">▶</button>
      </div>

      {error && (
        <div className="dp-error" role="alert">{error}</div>
      )}

      <div className="dp-grid" role="grid" aria-readonly>
        {/* Weekday headers */}
        {['D', 'L', 'M', 'M', 'G', 'V', 'S'].map((w) => (
          <div key={`h-${w}`} className="dp-cell dp-head" aria-hidden>{w}</div>
        ))}

        {/* Leading blanks until firstWeekday */}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`b-${i}`} className="dp-cell dp-blank" aria-hidden />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(viewYear, viewMonth, day);
          const iso = toIsoDate(date);
          const disabled = isDisabled(date);
          const selected = value ? toIsoDate(value) === iso : false;
          return (
            <button
              key={iso}
              type="button"
              className={`dp-cell dp-day${disabled ? ' disabled' : ''}${selected ? ' selected' : ''}`}
              aria-disabled={disabled}
              aria-pressed={selected}
              onClick={() => handleSelect(date)}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="dp-legend">
        {renderLegend ? renderLegend() : (
          <small>Le date disabilitate indicano festività o chiusure del coworking.</small>
        )}
      </div>

      <style>{`
        .datepicker { display: inline-block; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 8px; }
        .dp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .dp-cell { min-width: 36px; min-height: 36px; display:flex; align-items:center; justify-content:center; border-radius: 6px; }
        .dp-cell.dp-head { font-size: 0.85rem; color: #6b7280; }
        .dp-day { border: 1px solid rgba(0,0,0,0.1); background: #fff; cursor: pointer; }
        .dp-day:hover { background: #f3f4f6; }
        .dp-day.selected { background: #3b82f6; color: #fff; border-color: #2563eb; }
        .dp-day.disabled { background: #e5e7eb; color: #9ca3af; cursor: not-allowed; }
        .dp-blank { visibility: hidden; }
        .dp-error { color: #b91c1c; margin: 4px 0; font-size: 0.9rem; }
        .dp-legend { margin-top: 6px; color: #374151; }
      `}</style>
    </div>
  );
};
