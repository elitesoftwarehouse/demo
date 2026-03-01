import React from 'react';
import type { Station } from '../types';

export type StationDetailProps = {
  station?: Station | null;
  onClose?: () => void;
};

export const StationDetail: React.FC<StationDetailProps> = ({ station, onClose }) => {
  if (!station) return null;
  const updated = station.updatedAt ? new Date(station.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const bookingHref = `/booking?station=${encodeURIComponent(station.id)}`;

  // Responsive: bottom sheet by default; host page can place as side panel on wide screens
  return (
    <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label={`Dettagli ${station.id}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{station.id}{station.name ? ` — ${station.name}` : ''}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Chiudi dettagli">✕</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <div><strong>Stato:</strong> {station.status}</div>
        {updated && <div><strong>Aggiornato:</strong> {updated}</div>}
      </div>
      <div className="actions">
        <a className="btn primary" href={bookingHref}>Prenota</a>
        <a className="btn" href={`/#/stations/${station.id}`}>Dettagli</a>
      </div>
    </div>
  );
};
