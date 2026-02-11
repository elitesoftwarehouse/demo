import React, { useMemo } from 'react';
import { useDesksData } from './useDesksData';
import { useSelectedDate } from '../../context/SelectedDateContext';

export type DeskStatus = 'free' | 'busy' | 'unavailable';

export type BookingPreview = {
  deskId: string;
  date: string; // YYYY-MM-DD
};

export type Desk = {
  id: string;
  name: string;
  x: number;
  y: number;
  status: DeskStatus;
};

export type DashboardPageProps = { baseUrl?: string };

const statusToColorClass: Record<DeskStatus, string> = {
  free: 'desk-dot--green',
  busy: 'desk-dot--red',
  unavailable: 'desk-dot--gray',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ baseUrl }) => {
  const { date, setDate } = useSelectedDate();

  const { desks, loading, error, lastUpdated, refresh } = useDesksData({ baseUrl, date });

  const busyCount = useMemo(() => desks.filter((d) => d.status === 'busy').length, [desks]);
  const freeCount = useMemo(() => desks.filter((d) => d.status === 'free').length, [desks]);

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1>Disponibilità postazioni</h1>
        <div className="dashboard__filters">
          <label htmlFor="datePicker">Data</label>
          <input
            id="datePicker"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Seleziona data"
          />
          <button onClick={refresh} disabled={loading} aria-label="Aggiorna disponibilità">
            Aggiorna
          </button>
        </div>
        <div className="dashboard__legend" aria-label="Legenda disponibilità">
          <ul>
            <li>
              <span className="legend-dot legend-dot--green" aria-hidden="true" /> Disponibile
            </li>
            <li>
              <span className="legend-dot legend-dot--red" aria-hidden="true" /> Prenotata
            </li>
            <li>
              <span className="legend-dot legend-dot--gray" aria-hidden="true" /> Non prenotabile
            </li>
          </ul>
        </div>
      </header>

      {error && (
        <div role="alert" aria-live="assertive" className="dashboard__error">
          {error}
        </div>
      )}

      <section className="dashboard__summary" aria-label="Riepilogo disponibilità">
        <span>Libere: {freeCount}</span>
        <span>Occupate: {busyCount}</span>
        {lastUpdated && <span>Ultimo aggiornamento: {lastUpdated.toLocaleTimeString()}</span>}
      </section>

      <section className="dashboard__map" aria-label="Mappa postazioni">
        {desks.map((d) => (
          <button
            key={d.id}
            className={`desk-dot ${statusToColorClass[d.status]}`}
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
            title={`${d.name} - ${d.status === 'free' ? 'Disponibile' : d.status === 'busy' ? 'Prenotata' : 'Non prenotabile'}`}
            aria-label={`${d.name} ${d.status === 'free' ? 'disponibile' : d.status === 'busy' ? 'prenotata' : 'non prenotabile'}`}
            disabled={d.status !== 'free'}
          >
            {d.id}
          </button>
        ))}
      </section>
    </div>
  );
};
