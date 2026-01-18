import React, { useMemo, useState, useCallback } from 'react';

// Minimal Desk type expected by the map. Extend as needed by the app.
export type DeskStatus = 'LIBERA' | 'OCCUPATA' | 'NON_DISPONIBILE';

export interface DeskItem {
  id: string;
  numero?: string | number; // number/name label for the desk
  name?: string; // alternative label
  status: DeskStatus;
  // Optional metadata useful for preview
  piano?: string | number;
  edificio?: string;
  // Optional coordinates if a real map is used (not required here)
  x?: number;
  y?: number;
  // Any additional metadata
  meta?: Record<string, any>;
}

export interface BookingPreview {
  idPostazione: string;
  numeroPostazione: string;
  dataPrenotazione: string; // ISO or formatted string (consumer decides)
  piano?: string | number;
  edificio?: string;
}

export interface DeskMapViewProps {
  desks: DeskItem[];
  // If not provided, defaults to today according to local time
  selectedDate?: Date | string;
  // Notified when a user selects a free desk
  onDeskSelected?: (desk: DeskItem, date: Date, preview: BookingPreview) => void;
  // Optional className/style to customize container
  className?: string;
  style?: React.CSSProperties;
}

// Formats a date as ISO date (YYYY-MM-DD) while keeping local day selection intent
function formatISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DeskMapView: React.FC<DeskMapViewProps> = ({
  desks,
  selectedDate,
  onDeskSelected,
  className,
  style,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bookingDate: Date = useMemo(() => {
    if (!selectedDate) return new Date();
    if (selectedDate instanceof Date) return selectedDate;
    // Try parse string; fallback to today if invalid
    const parsed = new Date(selectedDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [selectedDate]);

  const handleDeskClick = useCallback(
    (desk: DeskItem) => {
      if (!desk || desk.status !== 'LIBERA') {
        // Non-free or invalid desk: do nothing as per UX guidelines
        return;
      }

      // Ensure only one selected at a time
      setSelectedId(desk.id);

      const numeroPostazione = String(desk.numero ?? desk.name ?? '');
      const preview: BookingPreview = {
        idPostazione: desk.id,
        numeroPostazione,
        dataPrenotazione: formatISODateLocal(bookingDate),
        piano: desk.piano,
        edificio: desk.edificio,
      };

      onDeskSelected?.(desk, bookingDate, preview);
    },
    [bookingDate, onDeskSelected]
  );

  // Simple visual representation: a responsive grid of desk "chips"
  // In real map integration, this would be replaced by positioned SVG/Canvas elements
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
        gap: 8,
        alignItems: 'stretch',
        ...(style || {}),
      }}
      // Click on empty area -> no action
      onClick={(e) => {
        // Intentionally left blank to ignore background clicks
      }}
      role="grid"
      aria-label="Mappa postazioni"
    >
      {desks.map((desk) => {
        const isFree = desk.status === 'LIBERA';
        const isSelected = selectedId === desk.id;
        const numero = String(desk.numero ?? desk.name ?? '');
        return (
          <button
            key={desk.id}
            type="button"
            role="gridcell"
            aria-selected={isSelected}
            onClick={(ev) => {
              ev.stopPropagation();
              handleDeskClick(desk);
            }}
            disabled={!isFree}
            title={isFree ? `Seleziona postazione ${numero}` : `Postazione non disponibile`}
            style={{
              cursor: isFree ? 'pointer' : 'not-allowed',
              border: isSelected ? '2px solid #1976d2' : '1px solid #ccc',
              borderRadius: 8,
              padding: '10px 8px',
              background: isFree ? (isSelected ? '#e3f2fd' : '#f7f7f7') : '#f0f0f0',
              color: '#222',
              opacity: isFree ? 1 : 0.6,
              minHeight: 56,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 600 }}>{numero || '—'}</span>
            <span style={{ fontSize: 12, marginTop: 2 }}>
              {isFree ? 'Libera' : desk.status === 'OCCUPATA' ? 'Occupata' : 'Non disp.'}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default DeskMapView;
