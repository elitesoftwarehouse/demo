import React, { useEffect, useState } from 'react';
import { fetchDesks, Desk, DeskStatus } from '../lib/desksApi';
import { useDeskOverrides } from '../lib/desksState';

const statusColor: Record<DeskStatus, string> = {
  FREE: '#22c55e',
  OCCUPIED: '#ef4444',
  UNAVAILABLE: '#9ca3af',
};

export function DashboardPostazioni({ baseUrl = '', refreshMs = 15000, onSelect, overrideStatuses, selectedDate }: { baseUrl?: string; refreshMs?: number; onSelect?: (desk: Desk) => void; overrideStatuses?: Record<string, DeskStatus>; selectedDate?: Date | string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Desk[]>([]);

  // Centralized override state (real-time UI after booking)
  const ctxOverrides = useDeskOverrides(selectedDate);

  const load = async () => {
    try {
      setError(null);
      const data = await fetchDesks(baseUrl);
      setItems(data.items);
    } catch (e: any) {
      setError(e?.message || 'Errore');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timer: any;
    load();
    if (refreshMs && refreshMs > 0) {
      timer = setInterval(load, refreshMs);
    }
    return () => timer && clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, refreshMs]);

  if (loading) return <div aria-label="loading">Caricamento…</div>;
  if (error) return <div role="alert">{error}</div>;

  const effectiveItems = items.map((d) => {
    const local = ctxOverrides[d.id];
    const prop = overrideStatuses && overrideStatuses[d.id] ? overrideStatuses[d.id] : undefined;
    const status = (prop || local || d.status) as DeskStatus;
    return { ...d, status } as Desk;
  });

  return (
    <div className="grid grid-cols-3 gap-2" aria-label="dashboard">
      {effectiveItems.map((d) => (
        <button
          key={d.id}
          data-testid={`desk-${d.id}`}
          style={{ backgroundColor: statusColor[d.status] }}
          className="h-12 rounded text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => d.status === 'FREE' && onSelect?.(d)}
          disabled={d.status !== 'FREE'}
          aria-disabled={d.status !== 'FREE'}
          aria-label={`Postazione ${d.name} ${d.status === 'FREE' ? 'disponibile' : d.status === 'OCCUPIED' ? 'prenotata' : 'non prenotabile'}`}
          title={d.status === 'FREE' ? 'Disponibile' : d.status === 'OCCUPIED' ? 'Prenotata' : 'Non prenotabile'}
        >
          {d.name}
        </button>
      ))}
      {effectiveItems.length < 12 && Array.from({ length: 12 - effectiveItems.length }).map((_, i) => (
        <div key={`empty-${i}`} className="h-12 rounded bg-gray-200" />
      ))}
    </div>
  );
}

export default DashboardPostazioni;
