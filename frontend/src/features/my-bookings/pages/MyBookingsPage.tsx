import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchMyBookings } from '../myBookingsApi';
import type { BookingDto } from '../types';
import { StatusFilter, type BookingStateFilter } from '../components/StatusFilter';
import { Paginator } from '../components/Paginator';
import { BookingStatusBadge } from '../../booking/components/BookingStatusBadge';

function useQueryParams() {
  const get = () => new URLSearchParams(window.location.search);
  const set = (params: URLSearchParams) => {
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', url);
  };
  return { get, set };
}

function readInitialFilter(): { state: BookingStateFilter; page: number; pageSize: number } {
  try {
    const qs = new URLSearchParams(window.location.search);
    const state = (qs.get('state')?.toUpperCase() as BookingStateFilter) || 'ALL';
    const page = Math.max(1, Number(qs.get('page') || '1'));
    const pageSize = Math.max(1, Number(qs.get('pageSize') || '10'));
    return { state: state === 'ATTIVA' || state === 'PASSATA' || state === 'CANCELLATA' ? state : 'ALL', page, pageSize };
  } catch {
    return { state: 'ALL', page: 1, pageSize: 10 };
  }
}

export const MyBookingsPage: React.FC = () => {
  const qp = useQueryParams();
  const init = useMemo(() => readInitialFilter(), []);
  const [stateFilter, setStateFilter] = useState<BookingStateFilter>(init.state);
  const [page, setPage] = useState<number>(init.page);
  const [pageSize, setPageSize] = useState<number>(init.pageSize);

  const [items, setItems] = useState<BookingDto[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const qs = qp.get();
    if (stateFilter && stateFilter !== 'ALL') qs.set('state', stateFilter);
    else qs.delete('state');
    qs.set('page', String(page));
    qs.set('pageSize', String(pageSize));
    qp.set(qs);
  }, [stateFilter, page, pageSize]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetchMyBookings({
      page,
      pageSize,
      state: stateFilter === 'ALL' ? undefined : (stateFilter as any),
    })
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
      })
      .catch((err) => {
        const msg = err?.message || 'Errore nel caricamento delle prenotazioni';
        setError(msg);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [stateFilter, page, pageSize]);

  function onChangeFilter(v: BookingStateFilter) {
    setStateFilter(v);
    setPage(1); // reset to first page when filter changes
  }

  return (
    <section style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1>Le mie prenotazioni</h1>

      {/* Responsive filter: select on very small screens, chips otherwise */}
      <div className="filters" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <StatusFilter value={stateFilter} onChange={onChangeFilter} />
      </div>

      {loading && (
        <div role="status" aria-live="polite" style={{ padding: 12 }}>Caricamento…</div>
      )}
      {error && (
        <div role="alert" style={{ color: '#DC2626' }}>{error}</div>
      )}

      {!loading && !error && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.length === 0 ? (
            <li style={{ padding: 12, color: '#6B7280' }}>Nessuna prenotazione trovata.</li>
          ) : (
            items.map((b) => (
              <li key={b.id} style={{ padding: '12px 0', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Postazione {b.stationId} — {new Date(b.date + 'T00:00:00').toLocaleDateString('it-IT')}</div>
                  {b.timeSlot && <div style={{ fontSize: 12, color: '#6B7280' }}>Fascia: {b.timeSlot}</div>}
                </div>
                <BookingStatusBadge state={b.state} />
              </li>
            ))
          )}
        </ul>
      )}

      <Paginator
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 20, 50]}
      />
    </section>
  );
};
