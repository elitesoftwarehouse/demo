import React from 'react';
import { useSelectedDate } from '../context/SelectedDateContext';
import { useAuth } from '../context/AuthContext';
import { fetchMyBookings, BookingItem, FetchMyBookingsResponse, StatusFilter } from '../services/myBookingsService';
import BookingStatusBadge from '../components/BookingStatusBadge';
import ConfirmCancelModal from '../components/ConfirmCancelModal';
import { cancelBooking, canCancelBy24h } from '../services/bookingCancellationService';
import { useLocation, useNavigate } from 'react-router-dom';

// "Le mie prenotazioni" — shows the authenticated user's bookings
// Requirements:
// - Calls backend endpoint /api/bookings/me (or uses stub fallback)
// - Keeps API order; no client re-sorting
// - Distinguishes future vs past with separate sections
// - Handles loading, error, empty state, and progressive loading (pagination)
// - Responsive and accessible

const sectionTitleStyle: React.CSSProperties = {
  margin: '1rem 0 0.5rem',
  fontSize: 18,
  fontWeight: 600,
  color: '#111827',
};

const listContainerStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  overflowX: 'auto',
};

const headerRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(100px,120px) minmax(80px,110px) 1fr minmax(96px,120px) minmax(120px,140px)',
  gap: 8,
  alignItems: 'center',
  padding: '8px 12px',
  background: '#f3f4f6',
  color: '#374151',
  fontSize: 12,
  fontWeight: 600,
  minWidth: 680,
};

const itemRowStyleBase: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(100px,120px) minmax(80px,110px) 1fr minmax(96px,120px) minmax(120px,140px)',
  gap: 8,
  alignItems: 'center',
  padding: '10px 12px',
  borderTop: '1px solid #f3f4f6',
  fontSize: 14,
  minWidth: 680,
};

const pastItemStyle: React.CSSProperties = { color: '#6b7280' }; // dimmed

const metaStyle: React.CSSProperties = { color: '#6b7280', fontSize: 12 };

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 12px',
  borderRadius: 8,
  background: '#111827',
  color: '#ffffff',
  border: '1px solid #111827',
  cursor: 'pointer',
};

const btnSecondaryStyle: React.CSSProperties = {
  ...btnStyle,
  background: '#ffffff',
  color: '#111827',
};

const btnDangerStyle: React.CSSProperties = {
  ...btnStyle,
  background: '#DC2626',
  borderColor: '#B91C1C',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  flexWrap: 'wrap',
  margin: '8px 0',
};

const filterGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const pillBase: React.CSSProperties = {
  ...btnSecondaryStyle,
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  borderColor: '#d1d5db',
};

const pillActive: React.CSSProperties = {
  ...pillBase,
  background: '#2563EB',
  color: '#ffffff',
  borderColor: '#1D4ED8',
};

const paginatorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

function formatDateIT(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  try {
    return dt.toLocaleDateString('it-IT', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return dt.toLocaleDateString('it-IT');
  }
}

function formatDateLongIT(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  try {
    return dt.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dt.toLocaleDateString('it-IT');
  }
}

function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'Giornata intera';
  const s = start || '';
  const e = end || '';
  return `${s}${s && e ? ' – ' : ''}${e}`;
}

function computeBadgeStatus(item: BookingItem, isPast?: boolean): string {
  // If cancelled, always show cancelled
  if ((item.status || '').toUpperCase() === 'CANCELLED' || (item.status as any) === 'CANCELED') return 'CANCELLATA';
  // For past list, show PASSATA regardless of original status
  if (isPast) return 'PASSATA';
  // Otherwise reflect current/legacy status
  return String(item.status || 'UNKNOWN');
}

function isCancellable(item: BookingItem, isPast?: boolean): boolean {
  const status = (item.status || '').toUpperCase();
  if (status === 'CANCELLED' || status === 'CANCELED' || status === 'CANCELLATA' || status === 'PASSATA') return false;
  // Pre-check 24h: if within 24h, hide/disable button; still rely on server as authority
  return canCancelBy24h(item.date, item.startTime ?? null);
}

function ItemRow({ item, isPast, onRequestCancel }: { item: BookingItem; isPast?: boolean; onRequestCancel?: (item: BookingItem) => void }) {
  const badgeStatus = computeBadgeStatus(item, isPast);
  const cancellable = !isPast && isCancellable(item, isPast);
  return (
    <div role="row" style={{ ...itemRowStyleBase, ...(isPast ? pastItemStyle : null) }}>
      <div role="cell" aria-label="Data">{formatDateIT(item.date)}</div>
      <div role="cell" aria-label="Orario">{formatTimeRange(item.startTime, item.endTime)}</div>
      <div role="cell" aria-label="Postazione e sede">
        <div style={{ fontWeight: 500 }}>{item.deskName || `Postazione ${item.deskId}`}</div>
        {item.locationName ? <div style={metaStyle}>{item.locationName}</div> : null}
      </div>
      <div role="cell" aria-label="Stato">
        <BookingStatusBadge status={badgeStatus} />
      </div>
      <div role="cell" aria-label="Azioni">
        {cancellable ? (
          <button data-testid={`cancel-${item.id}`} style={btnDangerStyle} onClick={() => onRequestCancel && onRequestCancel(item)}>Cancella</button>
        ) : (
          <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>
        )}
      </div>
    </div>
  );
}

function HeaderRow() {
  return (
    <div role="row" style={headerRowStyle}>
      <div role="columnheader">Data</div>
      <div role="columnheader">Orario</div>
      <div role="columnheader">Sede/Spazio</div>
      <div role="columnheader">Stato</div>
      <div role="columnheader">Azioni</div>
    </div>
  );
}

function useBookingsSection(scope: 'future' | 'past', status: StatusFilter, pageSize: number) {
  const { tokens, user } = useAuth();
  const [items, setItems] = React.useState<BookingItem[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null); // next cursor for loadMore
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [initialized, setInitialized] = React.useState(false);

  // Pagination state (keyset-based with cursor stack)
  const [page, setPage] = React.useState(1);
  const [cursorStack, setCursorStack] = React.useState<(string | null)[]>([null]); // index p-1 -> start cursor for page p
  const [hasNext, setHasNext] = React.useState(false);

  const commonOpts = React.useMemo(() => ({ token: tokens?.accessToken, scope as const, userId: user?.id }), [tokens?.accessToken, scope, user?.id]);

  const fetchPage = React.useCallback(async (startCursor: string | null) => {
    const res: FetchMyBookingsResponse = await fetchMyBookings({ ...commonOpts, limit: pageSize, cursor: startCursor, status });
    return res;
  }, [commonOpts, pageSize, status]);

  const ensureCursorForPage = React.useCallback(async (targetPage: number) => {
    // Ensure we have starting cursor for targetPage (index targetPage-1)
    if (targetPage <= cursorStack.length) return cursorStack[targetPage - 1] ?? null;
    // Iteratively fetch pages to build cursor stack
    let cur = cursorStack[cursorStack.length - 1] ?? null;
    let stack = [...cursorStack];
    while (stack.length < targetPage) {
      const r = await fetchPage(cur);
      const next = r.nextCursor ?? null;
      stack.push(next); // start of next page
      cur = next;
      if (!cur) break;
    }
    setCursorStack(stack);
    return stack[targetPage - 1] ?? null;
  }, [cursorStack, fetchPage]);

  const loadPage = React.useCallback(async (targetPage: number) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const start = await ensureCursorForPage(targetPage);
      if (start === undefined) {
        setLoading(false);
        return;
      }
      const r = await fetchPage(start ?? null);
      setItems(r.items);
      setCursor(r.nextCursor ?? null);
      setHasNext(!!r.nextCursor);
      setPage(targetPage);
      setInitialized(true);
      // Ensure cursor for next page is stored
      setCursorStack(prev => {
        const copy = [...prev];
        if (copy.length < targetPage + 1) {
          // fill up to targetPage
          while (copy.length < targetPage) copy.push(null);
          copy.push(r.nextCursor ?? null);
        } else {
          copy[targetPage] = r.nextCursor ?? null;
        }
        return copy;
      });
    } catch (e: any) {
      setError(e?.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  }, [ensureCursorForPage, fetchPage, loading]);

  const resetAndLoadFirst = React.useCallback(async () => {
    setItems([]);
    setCursor(null);
    setPage(1);
    setCursorStack([null]);
    setHasNext(false);
    await loadPage(1);
  }, [loadPage]);

  // Initial load and re-load when scope/status/pageSize changes
  React.useEffect(() => {
    resetAndLoadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, status, pageSize]);

  const hasMore = !!cursor; // for legacy "Carica altre" button

  // Optimistic update on cancel success
  const onCancelled = React.useCallback((bookingId: string) => {
    setItems(prev => prev.filter(it => it.id !== bookingId));
  }, []);

  return {
    items,
    hasMore,
    loadMore: () => {
      if (loading) return;
      setLoading(true);
      setError(null);
      fetchMyBookings({ ...commonOpts, limit: pageSize, cursor, status })
        .then(res => {
          setItems(prev => [...prev, ...res.items]);
          setCursor(res.nextCursor ?? null);
          setHasNext(!!res.nextCursor);
          setInitialized(true);
        })
        .catch((e: any) => setError(e?.message || 'Errore durante il caricamento'))
        .finally(() => setLoading(false));
    },
    reload: resetAndLoadFirst,
    loading,
    error,
    initialized,
    onCancelled,
    // Pagination API
    page,
    hasPrev: page > 1,
    hasNext,
    goPrev: () => {
      if (page > 1) void loadPage(page - 1);
    },
    goNext: () => {
      if (hasNext) void loadPage(page + 1);
    },
    goToPage: (p: number) => {
      if (p >= 1) void loadPage(p);
    },
  };
}

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

function StatusFilterBar({ value, onChange }: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  const makeBtn = (val: StatusFilter, label: string) => (
    <button
      key={val}
      data-testid={`filter-${val}`}
      style={value === val ? pillActive : pillBase}
      onClick={() => onChange(val)}
      aria-pressed={value === val}
    >
      {label}
    </button>
  );
  return (
    <div style={filterGroupStyle} role="tablist" aria-label="Filtro stato prenotazioni" data-testid="status-filter">
      {makeBtn('ALL', 'Tutte')}
      {makeBtn('ATTIVA', 'Attive')}
      {makeBtn('PASSATA', 'Passate')}
      {makeBtn('CANCELLATA', 'Cancellate')}
    </div>
  );
}

function PageSizeSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, color: '#4B5563' }}>Righe per pagina</span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' }}
        data-testid="page-size-select"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
    </label>
  );
}

function Paginator({ page, hasPrev, hasNext, loading, onPrev, onNext, testIdPrefix }: { page: number; hasPrev: boolean; hasNext: boolean; loading?: boolean; onPrev: () => void; onNext: () => void; testIdPrefix?: string }) {
  const prefix = testIdPrefix || 'paginator';
  return (
    <div style={paginatorStyle} data-testid={prefix}>
      <button data-testid={`${prefix}-prev`} onClick={onPrev} disabled={!hasPrev || loading} style={btnSecondaryStyle}>Precedente</button>
      <span data-testid={`${prefix}-label`} style={{ fontSize: 12, color: '#4B5563' }}>Pagina {page}</span>
      <button data-testid={`${prefix}-next`} onClick={onNext} disabled={!hasNext || loading} style={btnSecondaryStyle}>Successiva</button>
      {loading ? <span aria-live="polite" style={{ fontSize: 12, color: '#6B7280' }}>Caricamento…</span> : null}
    </div>
  );
}

const MyBookingsPage: React.FC = () => {
  const { date } = useSelectedDate();
  const { tokens } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Filters & controls
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');
  const [pageSize, setPageSize] = React.useState<number>(20);

  const [showPast, setShowPast] = React.useState(false);

  // Read initial params from URL
  React.useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const s = sp.get('status');
    const ps = sp.get('pageSize');
    const pastShown = sp.get('showPast');
    if (s === 'ALL' || s === 'ATTIVA' || s === 'PASSATA' || s === 'CANCELLATA') setStatusFilter(s as StatusFilter);
    if (ps) {
      const n = Number(ps);
      if ([10, 20, 50].includes(n)) setPageSize(n);
    }
    if (pastShown === '1') setShowPast(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync controls -> URL (keep other params like date)
  React.useEffect(() => {
    const sp = new URLSearchParams(location.search);
    sp.set('status', statusFilter);
    sp.set('pageSize', String(pageSize));
    if (statusFilter === 'ALL') {
      sp.set('showPast', showPast ? '1' : '0');
    } else {
      // Force show past when filtering specifically PASSATA/CANCELLATA
      sp.delete('showPast');
    }
    navigate({ search: sp.toString() }, { replace: true });
  }, [statusFilter, pageSize, showPast, location.search, navigate]);

  // Sections
  const future = useBookingsSection('future', statusFilter, pageSize);
  const past = useBookingsSection('past', statusFilter, pageSize);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalError, setModalError] = React.useState<string | null>(null);
  const [modalLoading, setModalLoading] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<BookingItem | null>(null);

  const requestCancel = (item: BookingItem) => {
    setSelectedItem(item);
    setModalError(null);
    setModalOpen(true);
  };

  const confirmCancel = async () => {
    if (!selectedItem) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await cancelBooking({ bookingId: selectedItem.id, date: selectedItem.date, startTime: selectedItem.startTime ?? null }, { token: tokens?.accessToken });
      setModalOpen(false);
      future.onCancelled(selectedItem.id);
    } catch (e: any) {
      const code = e?.code || e?.errorCode;
      if (code === 'POLICY_24H' || e?.status === 422) {
        setModalError("La prenotazione non può essere cancellata perché mancano meno di 24 ore all'orario di utilizzo.");
      } else if (e?.status === 403) {
        setModalError('Non sei autorizzato a cancellare questa prenotazione.');
      } else if (e?.status === 404) {
        setModalError('Prenotazione non trovata o già cancellata.');
      } else {
        setModalError('Impossibile cancellare la prenotazione. Riprova più tardi.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  React.useEffect(() => {
    if (statusFilter === 'PASSATA') {
      setShowPast(true);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    if (showPast && !past.initialized && !past.loading) past.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPast]);

  const showFutureSection = statusFilter === 'ALL' || statusFilter === 'ATTIVA' || statusFilter === 'CANCELLATA';
  const forceShowPast = statusFilter !== 'ALL';
  const showPastSection = (statusFilter === 'ALL' ? showPast : true) && (statusFilter === 'ALL' || statusFilter === 'PASSATA' || statusFilter === 'CANCELLATA');

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Le mie prenotazioni</h1>

      {/* Global toolbar: status filter + page size */}
      <div style={toolbarStyle}>
        <StatusFilterBar value={statusFilter} onChange={setStatusFilter} />
        <PageSizeSelect value={pageSize} onChange={setPageSize} />
      </div>

      {/* Future section */}
      {showFutureSection && (
        <section aria-labelledby="heading-future" style={{ marginTop: 8 }}>
          <div style={toolbarStyle}>
            <h2 id="heading-future" style={sectionTitleStyle}>Prossime</h2>
            <div data-testid="paginator-future">
              <Paginator testIdPrefix="paginator-future" page={future.page} hasPrev={future.hasPrev} hasNext={future.hasNext} loading={future.loading} onPrev={future.goPrev} onNext={future.goNext} />
            </div>
          </div>
          <div style={listContainerStyle} role="table" aria-label="Prossime prenotazioni" data-testid="future-table">
            <HeaderRow />
            <div role="rowgroup">
              {future.loading && !future.initialized ? (
                <div style={{ padding: 12 }} role="status" aria-live="polite">Caricamento…</div>
              ) : future.error ? (
                <div style={{ padding: 12, color: '#B91C1C' }} data-testid="error-future">Errore: {future.error} <button onClick={future.reload} style={{ ...btnSecondaryStyle, marginLeft: 8 }}>Riprova</button></div>
              ) : future.items.length === 0 ? (
                <div style={{ padding: 12, color: '#6b7280' }} data-testid="empty-future">Nessuna prenotazione futura trovata.</div>
              ) : (
                future.items.map((it) => <ItemRow key={it.id} item={it} onRequestCancel={requestCancel} />)
              )}
            </div>
          </div>
          {/* Legacy progressive load retained for compatibility */}
          {future.hasMore && (
            <div style={{ marginTop: 8 }}>
              <button onClick={future.loadMore} disabled={future.loading} style={btnStyle} data-testid="future-load-more">
                {future.loading ? 'Caricamento…' : 'Carica altre'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Past section */}
      {showPastSection && (
        <section aria-labelledby="heading-past" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h2 id="heading-past" style={sectionTitleStyle}>Passate</h2>
            {statusFilter === 'ALL' && (
              <button
                aria-expanded={showPast}
                aria-controls="past-list"
                onClick={() => setShowPast(s => !s)}
                style={btnSecondaryStyle}
                data-testid="toggle-past"
              >
                {showPast ? 'Nascondi' : 'Mostra'}
              </button>
            )}
            {statusFilter !== 'ALL' && (
              <div data-testid="paginator-past">
                <Paginator testIdPrefix="paginator-past" page={past.page} hasPrev={past.hasPrev} hasNext={past.hasNext} loading={past.loading} onPrev={past.goPrev} onNext={past.goNext} />
              </div>
            )}
          </div>
          {(statusFilter !== 'ALL' || showPast) && (
            <div id="past-list" style={{ ...listContainerStyle, marginTop: 8 }} role="table" aria-label="Prenotazioni passate" data-testid="past-table">
              <HeaderRow />
              <div role="rowgroup">
                {past.loading && !past.initialized ? (
                  <div style={{ padding: 12 }} role="status" aria-live="polite">Caricamento…</div>
                ) : past.error ? (
                  <div style={{ padding: 12, color: '#B91C1C' }} data-testid="error-past">Errore: {past.error} <button onClick={past.reload} style={{ ...btnSecondaryStyle, marginLeft: 8 }}>Riprova</button></div>
                ) : past.items.length === 0 ? (
                  <div style={{ padding: 12, color: '#6b7280' }} data-testid="empty-past">Nessuna prenotazione passata.</div>
                ) : (
                  past.items.map((it) => <ItemRow key={it.id} item={it} isPast />)
                )}
              </div>
            </div>
          )}
          {/* Legacy progressive load retained for compatibility */}
          {showPast && past.hasMore && statusFilter === 'ALL' && (
            <div style={{ marginTop: 8 }}>
              <button onClick={past.loadMore} disabled={past.loading} style={btnStyle} data-testid="past-load-more">
                {past.loading ? 'Caricamento…' : 'Carica altre'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Confirmation Modal */}
      <ConfirmCancelModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={confirmCancel}
        isConfirming={modalLoading}
        errorMessage={modalError}
        dateLabel={selectedItem ? formatDateLongIT(selectedItem.date) : undefined}
        deskLabel={selectedItem ? (selectedItem.deskName || `Postazione ${selectedItem.deskId}`) : undefined}
      />

      {/* SR helper for the current context date (shared across app) */}
      <div style={srOnly} aria-live="polite">Contesto data corrente: {date.toLocaleDateString('it-IT')}</div>
    </div>
  );
};

export default MyBookingsPage;
