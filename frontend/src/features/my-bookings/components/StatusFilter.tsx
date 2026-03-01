import React from 'react';

export type BookingStateFilter = 'ALL' | 'ATTIVA' | 'PASSATA' | 'CANCELLATA';

export type StatusFilterProps = {
  value: BookingStateFilter;
  onChange: (value: BookingStateFilter) => void;
  condensed?: boolean; // for small screens
};

const LABELS: Record<BookingStateFilter, string> = {
  ALL: 'Tutte',
  ATTIVA: 'Attive',
  PASSATA: 'Passate',
  CANCELLATA: 'Cancellate',
};

export const StatusFilter: React.FC<StatusFilterProps> = ({ value, onChange, condensed }) => {
  const options: BookingStateFilter[] = ['ALL', 'ATTIVA', 'PASSATA', 'CANCELLATA'];

  if (condensed) {
    return (
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 600 }}>Stato:</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as BookingStateFilter)}
          aria-label="Filtro stato prenotazioni"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{LABELS[opt]}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div role="tablist" aria-label="Filtro stato" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt)}
            className={`chip ${active ? 'chip--active' : ''}`}
            style={{
              padding: '6px 10px',
              borderRadius: 9999,
              border: '1px solid #D1D5DB',
              background: active ? '#1F2937' : '#fff',
              color: active ? '#fff' : '#1F2937',
              cursor: 'pointer',
            }}
          >
            {LABELS[opt]}
          </button>
        );
      })}
    </div>
  );
};
