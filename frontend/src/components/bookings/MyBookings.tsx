import React, { useMemo, useState } from 'react';
import { BookingList } from './BookingList';
import './BookingStatusBadge.css';

// Added minimal data-testid and aria attributes to support testing and accessibility
// Non-invasive: preserves existing rendering while exposing hooks for tests

type BookingState = 'ATTIVA' | 'PASSATA' | 'CANCELLATA';

export function MyBookings() {
  const [state, setState] = useState<BookingState>('ATTIVA');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filter changes
  function onChangeState(next: BookingState) {
    if (next !== state) {
      setState(next);
      setPage(1);
    }
  }

  // Placeholder: data would come from hook/API using state/page/pageSize
  const meta = useMemo(() => ({
    page,
    pageSize,
    totalItems: 0,
    totalPages: 0,
  }), [page, pageSize]);

  return (
    <div>
      <div role="tablist" aria-label="Filtri stato prenotazioni" className="mb-2">
        <button
          role="tab"
          aria-selected={state === 'ATTIVA'}
          onClick={() => onChangeState('ATTIVA')}
          data-testid="tab-attive"
        >
          Attive
        </button>
        <button
          role="tab"
          aria-selected={state === 'PASSATA'}
          onClick={() => onChangeState('PASSATA')}
          data-testid="tab-passate"
        >
          Passate
        </button>
        <button
          role="tab"
          aria-selected={state === 'CANCELLATA'}
          onClick={() => onChangeState('CANCELLATA')}
          data-testid="tab-cancellate"
        >
          Cancellate
        </button>
      </div>

      {/* Pagination controls (bounds disabling depends on meta) */}
      <div aria-label="Controlli paginazione" className="mb-2">
        <button
          type="button"
          aria-label="Indietro"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Indietro
        </button>
        <span aria-live="polite" data-testid="page-indicator">
          Pagina {meta.page} di {Math.max(1, meta.totalPages)}
        </span>
        <button
          type="button"
          aria-label="Avanti"
          onClick={() => setPage((p) => (meta.totalPages && p < meta.totalPages ? p + 1 : p))}
          disabled={meta.totalPages ? page >= meta.totalPages : true}
        >
          Avanti
        </button>
      </div>

      <label>
        Page size
        <select
          aria-label="PageSize"
          value={pageSize}
          onChange={(e) => {
            const next = Number(e.target.value || 10);
            if (next !== pageSize) {
              setPageSize(next);
              setPage(1);
            }
          }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
      </label>

      <BookingList />
    </div>
  );
}
