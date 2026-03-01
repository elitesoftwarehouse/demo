import React from 'react';

export const LegendBar: React.FC<{ updatedAt?: string }> = ({ updatedAt }) => {
  const timeLabel = updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="legend" aria-label="Legenda stati">
      <span><i className="dot available" aria-hidden="true" /> Libero</span>
      <span><i className="dot busy" aria-hidden="true" /> Occupato</span>
      <span><i className="dot unavailable" aria-hidden="true" /> Non disponibile</span>
      <time aria-label="Ultimo aggiornamento">{timeLabel}</time>
    </div>
  );
};
