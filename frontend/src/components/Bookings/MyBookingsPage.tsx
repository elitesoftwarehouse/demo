import React, { useEffect, useMemo, useState } from 'react';
import { listMyBookings, type UserBookingItemDto, cancelMyBooking } from '../../api/bookingsClient';
import { sortBookings } from './sortUtils';
import { BookingStatusBadge } from './BookingStatusBadge';

export type MyBookingsPageProps = { baseUrl?: string };

type UiState = 'idle' | 'loading' | 'error' | 'ready' | 'empty';

type ConfirmState = { id: string; open: boolean } | null;

type Toast = { type: 'success' | 'error'; message: string } | null;

type FilterValue = 'ALL' | 'ATTIVA' | 'PASSATA' | 'CANCELLATA';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function hoursDiff(fromIso: string, to = new Date()): number {
  const start = new Date(fromIso).getTime();
  const now = to.getTime();
  return (start - now) / (1000 * 60 * 60);
}

function canCancelClient(item: UserBookingItemDto): boolean {
  // Hide/disable cancel when clearly not allowed on client side:
  // - state already cancelled or passed
  const st = (item.state || item.status || '').toUpperCase();
  if (st.includes('CANC')) return false;
  if (st.includes('PASS')) return false;
  // - within 24 hours window (best-effort pre-check)
  const h = hoursDiff(item.startDate);
  return h >= 24;
}

function parseInitialQuery(): { page?: number; status?: FilterValue } {
  try {
    const sp = new URLSearchParams(window.location.search);
    const p = parseInt(sp.get('page') || '1', 10);
    const s = (sp.get('status') || 'ALL').toUpperCase();
    const status = (['ALL', 'ATTIVA', 'PASSATA', 'CANCELLATA'] as FilterValue[]).includes(s as FilterValue)
      ? (s as FilterValue)
      : 'ALL';
    return { page: Number.isFinite(p) && p > 0 ? p : 1, status };
  } catch {
    return {};
  }
}

function syncUrl(page: number, status: FilterValue) {
  try {
    const sp = new URLSearchParams(window.location.search);
    sp.set('page', String(page));
    sp.set('status', status);
    const newUrl = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState(null, '', newUrl);
  } catch {
    // ignore
  }
}

const FilterTabs: React.FC<{
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}> = ({ value, onChange }) => {
  const options: Array<{ label: string; value: FilterValue }> = [
    { label: 'Tutte', value: 'ALL' },
    { label: 'Attive', value: 'ATTIVA' },
    { label: 'Passate', value: 'PASSATA' },
    { label: 'Cancellate', value: 'CANCELLATA' },
  ];
  return (
    <div role="tablist" aria-label="Filtra per stato" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            style={{
              padding: '6px 10px', borderRadius: 20,
              border: selected ? '1px solid #2563eb' : '1px solid #d1d5db',
              background: selected ? '#dbeafe' : '#ffffff', color: '#111827',
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

const Paginator: React.FC<{
  page: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  totalPages?: number;
  onChange: (page: number) => void;
}> = ({ page, hasPrevious, hasNext, totalPages, onChange }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={!hasPrevious && page <= 1}
        aria-disabled={!hasPrevious && page <= 1}
        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff' }}
      >
        ◀ Precedente
      </button>
      <div>
        Pagina {page}{typeof totalPages === 'number' && totalPages > 0 ? ` di ${totalPages}` : ''}
      </div>
      <button
        onClick={() => onChange(page + 1)}
        disabled={!hasNext}
        aria-disabled={!hasNext}
        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff' }}
      >
        Successiva ▶
      </button>
    </div>
  );
};

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ baseUrl = '/api' }) => {
  const initial = parseInitialQuery();

  const [items, setItems] = useState<UserBookingItemDto[]>([]);
  const [ui, setUi] = useState<UiState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [toast, setToast] = useState<Toast>(null);

  const [page, setPage] = useState<number>(initial.page || 1);
  const [size, setSize] = useState<number>(20);
  const [statusFilter, setStatusFilter] = useState<FilterValue>(initial.status || 'ALL');

  const [hasNext, setHasNext] = useState<boolean>(false);
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);

  const sortedItems = useMemo(() => sortBookings(items), [items]);

  async function load() {
    setUi('loading');
    setError(null);
    try {
      const res = await listMyBookings({ page, size, status: statusFilter }, { baseUrl });
      const sorted = sortBookings(res.items || []);
      setItems(sorted);
      setHasNext(!!res.hasNext);
      setHasPrevious(!!res.hasPrevious || page > 1);
      setTotalPages(typeof res.totalPages === 'number' ? res.totalPages : undefined);
      setUi(sorted.length ? 'ready' : 'empty');
      syncUrl(page, statusFilter);
    } catch (e: any) {
      setError(String(e?.message || 'error'));
      setUi('error');
    }
  }

  // Load on mount and when deps change
  useEffect(() => { void load(); }, [baseUrl, page, size, statusFilter]);

  // When filter changes, reset page to 1
  function onFilterChange(v: FilterValue) {
    setStatusFilter(v);
    setPage(1);
  }

  async function handleConfirmCancel(id: string) {
    setConfirm({ id, open: false });
    try {
      const res = await cancelMyBooking(id, { baseUrl });
      setToast({ type: 'success', message: 'Prenotazione cancellata con successo' });
      // Reload current page to keep pagination totals in sync
      await load();
      // If backend returns updated item instead of deletion and reload failed, merge it
      if (res.item) {
        setItems((prev) => {
          const exists = prev.find((p) => p.id === res.item!.id);
          if (!exists) return prev;
          return prev.map((p) => (p.id === res.item!.id ? res.item! : p));
        });
      }
    } catch (e: any) {
      const msg = e?.details?.reasonKey === 'booking.cannot_cancel_within_24h'
        ? 'La prenotazione non può essere cancellata perché mancano meno di 24 ore all’uso'
        : e?.message || 'Impossibile cancellare la prenotazione';
      setToast({ type: 'error', message: String(msg) });
    }
  }

  function closeToast() { setToast(null); }

  if (ui === 'loading' || ui === 'idle') {
    return <div aria-busy="true">Caricamento…</div>;
  }

  if (ui === 'error') {
    return (
      <div>
        <div role="alert">Errore: {error}</div>
        <button onClick={() => load()}>Riprova</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Le Mie Prenotazioni</h1>

      {/* Controls bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '12px 0' }}>
        <FilterTabs value={statusFilter} onChange={onFilterChange} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="page-size" style={{ color: '#374151' }}>Elementi per pagina</label>
          <select
            id="page-size"
            value={size}
            onChange={(e) => { setPage(1); setSize(parseInt(e.target.value, 10)); }}
            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {toast && (
        <div role={toast.type === 'error' ? 'alert' : 'status'}
             style={{
               margin: '8px 0', padding: '8px 12px', borderRadius: 6,
               background: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
               color: '#111827',
             }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{toast.message}</span>
            <button onClick={closeToast} aria-label="Chiudi">×</button>
          </div>
        </div>
      )}

      {ui === 'empty' ? (
        <div>Nessuna prenotazione</div>
      ) : (
        <>
          {/* Top paginator for long lists */}
          <div style={{ margin: '8px 0' }}>
            <Paginator
              page={page}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              totalPages={totalPages}
              onChange={(p) => setPage(p)}
            />
          </div>

          <ul>
            {sortedItems.map((b) => {
              const showCancel = canCancelClient(b);
              return (
                <li key={b.id} data-testid="booking-row" data-start={new Date(b.startDate).toISOString()} style={{ marginBottom: 12, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 220 }}>
                      <div><strong>Postazione:</strong> {b.deskId}</div>
                      <div><strong>Data/ora:</strong> {formatDate(b.startDate)}</div>
                      <div>
                        <strong>Stato:</strong>{' '}
                        <BookingStatusBadge value={b.state ?? b.status} size="md" />
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => setConfirm({ id: b.id, open: true })}
                        disabled={!showCancel}
                        aria-disabled={!showCancel}
                        style={{
                          padding: '8px 12px', borderRadius: 6, border: '1px solid #dc2626',
                          background: showCancel ? '#ffffff' : '#f3f4f6', color: '#dc2626', cursor: showCancel ? 'pointer' : 'not-allowed',
                        }}
                        title={showCancel ? 'Cancella prenotazione' : 'Cancellazione non disponibile (entro 24 ore o già non attiva)'}
                      >
                        Cancella
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Bottom paginator */}
          <div style={{ margin: '8px 0' }}>
            <Paginator
              page={page}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              totalPages={totalPages}
              onChange={(p) => setPage(p)}
            />
          </div>
        </>
      )}

      {/* Simple confirm dialog */}
      {confirm && confirm.open && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, maxWidth: 420, width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Confermi la cancellazione della prenotazione?</h2>
            <p style={{ marginTop: 8 }}>Ricorda: puoi cancellare solo se mancano più di 24 ore all’orario di utilizzo.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setConfirm(null)}>Annulla</button>
              <button onClick={() => confirm?.id && handleConfirmCancel(confirm.id)} style={{ background: '#dc2626', color: '#fff', border: '1px solid #dc2626', padding: '6px 12px', borderRadius: 6 }}>Conferma</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
