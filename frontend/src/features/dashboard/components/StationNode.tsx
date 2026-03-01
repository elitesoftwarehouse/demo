import React from 'react';
import type { Station, StationStatus } from '../types';

export type StationNodeProps = {
  station: Station;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

function statusToLabel(status: StationStatus): string {
  switch (status) {
    case 'available':
      return 'Libero';
    case 'busy':
      return 'Occupato';
    case 'unavailable':
      return 'Non disponibile';
    default:
      return status;
  }
}

export const StationNode: React.FC<StationNodeProps> = ({ station, selected, onSelect }) => {
  const cls = `node ${station.status}${selected ? ' selected' : ''}`;
  const label = `Postazione ${station.id} — ${statusToLabel(station.status)}`;
  const disabled = station.status !== 'available';
  return (
    <button
      type="button"
      className={cls}
      aria-pressed={selected}
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => !disabled && onSelect?.(station.id)}
      style={disabled ? { cursor: 'not-allowed', opacity: 0.9 } : undefined}
    >
      {station.id}
    </button>
  );
};
