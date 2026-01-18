import React, { useMemo, useState } from 'react';
import type { Desk, DeskStatus } from './types';
import { DashboardStyles } from './styles';
import { useSelectedDate } from '../../lib/date/SelectedDateContext';

// Minimal, presentational component to validate the structure and interactions (no data wiring)
export interface DashboardProps {
  desks?: Desk[]; // defaults to 12 placeholder desks
  onRefresh?: () => void;
  onBook?: (deskId: string) => void;
}

const DEFAULT_DESKS: Desk[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `D${i + 1}`,
  label: `Postazione ${i + 1}`,
  status: (['free', 'occupied', 'unavailable'] as DeskStatus[])[i % 3],
}));

export function Dashboard({ desks = DEFAULT_DESKS, onRefresh, onBook }: DashboardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const items = useMemo(() => desks.slice(0, 12), [desks]);

  const selectedDesk = items.find((d) => d.id === selected) || null;

  const { date, setDate, resetToToday } = useSelectedDate();

  return (
    <div className="sd-dashboard" data-mode={selected ? 'detail' : 'grid'}>
      <header className="sd-header">
        <h1 className="sd-title">Postazioni</h1>
        <div className="sd-actions">
          <input
            aria-label="Seleziona data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="sd-btn" onClick={resetToToday}>Oggi</button>
          <button className="sd-btn sd-btn-refresh" aria-label="Aggiorna" onClick={onRefresh}>
            ⟳
          </button>
        </div>
      </header>

      <main className="sd-main" role="grid" aria-label="Mappa postazioni">
        <div className="sd-grid">
          {items.map((d) => (
            <button
              key={d.id}
              role="gridcell"
              aria-label={`${d.label}, stato: ${statusLabel(d.status)}`}
              aria-pressed={selected === d.id}
              className={`sd-cell sd-${d.status} ${selected === d.id ? 'is-selected' : ''}`}
              onClick={() => setSelected(d.id)}
            >
              <span className="sd-cell-label">{d.label}</span>
              <span className="sd-cell-icon" aria-hidden>
                {statusIcon(d.status)}
              </span>
            </button>
          ))}
        </div>
      </main>

      <aside className="sd-legend" aria-label="Legenda stati">
        <LegendItem color="free" label="Libero" icon="✓" />
        <LegendItem color="occupied" label="Occupato" icon="⏳" />
        <LegendItem color="unavailable" label="N/D" icon="✕" />
      </aside>

      <button className="sd-fab" aria-label="Aggiorna" onClick={onRefresh}>
        ⟳
      </button>

      {selectedDesk && (
        <div className="sd-sheet" role="dialog" aria-modal="true" aria-label={`Dettagli ${selectedDesk.label}`}>
          <div className="sd-sheet-content">
            <div className={`sd-badge sd-${selectedDesk.status}`}>
              <span className="sd-badge-icon" aria-hidden>
                {statusIcon(selectedDesk.status)}
              </span>
              <span className="sd-badge-text">{statusLabel(selectedDesk.status)}</span>
            </div>
            <h2 className="sd-sheet-title">{selectedDesk.label}</h2>
            <p className="sd-sheet-sub">ID: {selectedDesk.id}</p>

            <div className="sd-sheet-actions">
              <button
                className="sd-btn sd-primary"
                disabled={selectedDesk.status !== 'free'}
                onClick={() => onBook && onBook(selectedDesk.id)}
              >
                Prenota
              </button>
              <button className="sd-btn" onClick={() => setSelected(null)}>Chiudi</button>
            </div>
          </div>
        </div>
      )}

      <DashboardStyles />
    </div>
  );
}

function LegendItem({ color, label, icon }: { color: DeskStatus; label: string; icon: string }) {
  return (
    <div className={`sd-chip sd-${color}`} role="note" aria-label={`${label}`}> 
      <span aria-hidden>{icon}</span>
      <span className="sd-chip-text">{label}</span>
    </div>
  );
}

function statusIcon(s: DeskStatus) {
  switch (s) {
    case 'free':
      return '✓';
    case 'occupied':
      return '⏳';
    case 'unavailable':
      return '✕';
  }
}

function statusLabel(s: DeskStatus) {
  switch (s) {
    case 'free':
      return 'Libero';
    case 'occupied':
      return 'Occupato';
    case 'unavailable':
      return 'Non disponibile';
  }
}

export default Dashboard;
