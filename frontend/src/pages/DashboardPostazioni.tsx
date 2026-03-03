import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useStationsPolling, Station } from '../hooks/useStationsPolling';
import ConfirmBookingModal from '../components/ConfirmBookingModal';
import { createDeskBooking } from '../services/bookingService';
import { useSelectedDate } from '../context/SelectedDateContext';

// DashboardPostazioni: mappa interattiva 12 postazioni (mobile-first)
// - Griglia 3x4 su mobile, 4x3 su viewport >= 768px
// - Stati: FREE (libero), OCCUPIED (occupato), UNAVAILABLE (non disponibile)
// - Colori accessibili e icone semplificate
// - Selezione mostra popup di conferma prenotazione per postazioni libere
// - Gestione loading ed errore con retry e polling periodico

export type StationStatus = 'FREE' | 'OCCUPIED' | 'UNAVAILABLE';

export type { Station };

const STATUS_LABEL: Record<StationStatus, string> = {
  FREE: 'Libero',
  OCCUPIED: 'Occupato',
  UNAVAILABLE: 'Non disponibile',
};

const statusStyles: Record<StationStatus, { bg: string; fg: string; border?: string; icon: string } > = {
  FREE: { bg: '#059669', fg: '#ffffff', border: '1px solid #047857', icon: '●' }, // emerald
  OCCUPIED: { bg: '#dc2626', fg: '#ffffff', border: '1px solid #b91c1c', icon: '■' }, // red
  UNAVAILABLE: { bg: '#9ca3af', fg: '#111827', border: '1px solid #6b7280', icon: '×' }, // gray
};

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

// Booking preview object to pass to popup/upper components
export type BookingPreview = {
  idPostazione: string;
  numeroPostazione: string; // readable label/number
  dataPrenotazione: Date;
  piano?: string | null;
  edificio?: string | null;
};

const DashboardPostazioni: React.FC<{
  onPrenota?: (s: Station) => void;
  bookingDate?: Date;
  // New optional callbacks for upper components
  onDeskSelected?: (desk: Station, date: Date, preview: BookingPreview) => void;
  onBookingConfirm?: (preview: BookingPreview) => void | Promise<void>;
}> = ({ onPrenota, bookingDate, onDeskSelected, onBookingConfirm }) => {
  const { tokens, user } = useAuth();
  const accessToken = tokens?.accessToken;
  const { date: selectedDate, dateKey, setDate } = useSelectedDate();

  // Polling hook: default every 30s; can be tuned via env or props in the future
  const { stations, loading, error, reload } = useStationsPolling({ token: accessToken, intervalMs: 30000, debounceMs: 300 });

  const [selected, setSelected] = React.useState<Station | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);

  // Optimistic override of station statuses after successful booking (per-date, clears via TTL/manual refresh)
  const [overrides, setOverrides] = React.useState<Record<string, StationStatus>>({});
  // Enhanced overrides with TTL to avoid flicker if backend is eventually consistent
  const [overridesV2, setOverridesV2] = React.useState<Record<string, { status: StationStatus; expiresAt?: number }>>({});

  // Toast message for non-invasive feedback
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimerRef = React.useRef<number | null>(null);

  const clearToast = React.useCallback(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  // helper for date key YYYY-MM-DD
  function toDateKey(d: Date) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    return `${y}-${pad(m)}-${pad(day)}`;
  }

  const currentDate = bookingDate ?? selectedDate;
  const currentDateKey = React.useMemo(() => toDateKey(currentDate), [currentDate]);

  // Reset selection when data refreshes to avoid stale selection
  React.useEffect(() => {
    setSelected(null);
    setShowConfirm(false);
    setConfirming(false);
    setConfirmError(null);
  }, [stations]);

  React.useEffect(() => () => clearToast(), [clearToast]);

  const buildPreview = React.useCallback((s: Station, date: Date): BookingPreview => {
    return {
      idPostazione: s.id,
      numeroPostazione: s.name, // in futuro si potrà mappare ad un numero
      dataPrenotazione: date,
      piano: null,
      edificio: null,
    };
  }, []);

  const handleSelect = (s: Station) => {
    // Respect effective status for selection (considering overrides)
    const eff = getEffectiveStatus(s.id, s.status);
    if (eff !== 'FREE') return; // only free desks trigger selection/modal
    setSelected(s);
    setShowConfirm(true);
    setConfirmError(null);
    const preview = buildPreview(s, currentDate);
    if (onDeskSelected) onDeskSelected(s, currentDate, preview);
  };

  const handlePrenota = (s: Station) => {
    // Backward compatibility handler
    if (onPrenota) {
      onPrenota(s);
      return;
    }
    // Default: semplice notifica. Integrazione reale può navigare a /booking
    // eslint-disable-next-line no-alert
    alert(`Azione prenotazione per: ${s.name}`);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const preview = buildPreview(selected, currentDate);
    if (onBookingConfirm) onBookingConfirm(preview);
    handlePrenota(selected);
    setShowConfirm(false);
  };

  const pruneOverridesV2 = React.useCallback(() => {
    const now = Date.now();
    let changed = false;
    const next: Record<string, { status: StationStatus; expiresAt?: number }> = {};
    for (const [k, v] of Object.entries(overridesV2)) {
      if (v.expiresAt && v.expiresAt <= now) {
        changed = true;
      } else {
        next[k] = v;
      }
    }
    if (changed) setOverridesV2(next);
  }, [overridesV2]);

  // Periodically prune expired optimistic overrides
  React.useEffect(() => {
    const id = window.setInterval(() => pruneOverridesV2(), 5000);
    return () => window.clearInterval(id);
  }, [pruneOverridesV2]);

  const clearAllOverrides = React.useCallback(() => {
    setOverrides({});
    setOverridesV2({});
  }, []);

  const handleManualRefresh = React.useCallback(() => {
    clearAllOverrides();
    void reload();
  }, [clearAllOverrides, reload]);

  const handleConfirmWithPreview = async (preview: BookingPreview) => {
    try {
      setConfirmError(null);
      setConfirming(true);
      // If parent provided a hook, call it first (can throw)
      if (onBookingConfirm) {
        await Promise.resolve(onBookingConfirm(preview));
      }
      // Then attempt backend booking (or stub)
      const dateKey = toDateKey(preview.dataPrenotazione);
      if (!user?.id) throw new Error('Utente non autenticato');
      await createDeskBooking(
        { deskId: preview.idPostazione, date: dateKey, userId: user.id },
        { token: accessToken, preferApi: true }
      );

      // Optimistic update: mark selected desk as OCCUPIED immediately (per-date)
      const k = `${dateKey}:${preview.idPostazione}`;
      setOverrides(prev => ({ ...prev, [k]: 'OCCUPIED' }));
      // TTL ~60s to allow backend to propagate new state without flicker
      setOverridesV2(prev => ({
        ...prev,
        [k]: { status: 'OCCUPIED', expiresAt: Date.now() + 60_000 },
      }));

      // User feedback: toast message
      setToast('Prenotazione confermata');
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);

      if (selected) handlePrenota(selected);
      setShowConfirm(false);
      // Trigger a reload to reconcile with server state (override persists until TTL)
      void reload();
    } catch (e: any) {
      // Map known errors (status and backend code)
      let mapped = 'Si è verificato un errore durante la prenotazione. Riprova.';
      if (e && typeof e === 'object') {
        const status = (e as any).status;
        const body = (e as any).body || {};
        const code = body?.code;
        if (code === 'COWORKING_CLOSED') {
          mapped = 'Non è possibile prenotare in questa data: il coworking è chiuso.';
        } else if (status === 409) {
          mapped = 'La postazione è stata prenotata da un altro utente. Scegli un’altra postazione.';
        } else if (status === 422) {
          mapped = 'La data selezionata non è valida.';
        } else if (status === 401 || status === 403) {
          mapped = 'Sessione scaduta o non autorizzata. Accedi nuovamente.';
        }
      }
      setConfirmError(mapped);
    } finally {
      setConfirming(false);
    }
  };

  // Helper: compute effective status with precedence overridesV2 -> legacy overrides -> base
  const getEffectiveStatus = React.useCallback((id: string, base: StationStatus): StationStatus => {
    const key = `${currentDateKey}:${id}`;
    const o = overridesV2[key];
    if (o) {
      if (!o.expiresAt || o.expiresAt > Date.now()) return o.status;
    }
    return overrides[key] || base;
  }, [overrides, overridesV2, currentDateKey]);

  const GridCell: React.FC<{ item: Station; index: number }> = ({ item, index }) => {
    // Apply optimistic override if present
    const effectiveStatus = getEffectiveStatus(item.id, item.status);
    const style = statusStyles[effectiveStatus];
    const isSelectable = effectiveStatus === 'FREE';
    const isSelected = selected?.id === item.id;

    const base: React.CSSProperties = {
      position: 'relative',
      borderRadius: 10,
      border: style.border,
      background: style.bg,
      color: style.fg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 72, // Touch target sufficiente su mobile
      padding: '0.5rem',
      textAlign: 'center',
      userSelect: 'none',
      cursor: isSelectable ? 'pointer' : 'not-allowed',
      outline: isSelected ? '3px solid rgba(17,24,39,0.85)' : 'none',
      boxShadow: isSelected ? '0 0 0 2px rgba(17,24,39,0.25) inset' : 'none',
      width: '100%',
    };

    const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isSelectable) handleSelect(item);
      }
    };

    return (
      <button
        type="button"
        onClick={() => isSelectable && handleSelect(item)}
        onKeyDown={handleKey}
        aria-label={`${item.name} — ${STATUS_LABEL[effectiveStatus]}`}
        title={`${item.name} — ${STATUS_LABEL[effectiveStatus]}`}
        style={base}
        disabled={!isSelectable}
      >
        <span aria-hidden style={{ fontSize: 12, position: 'absolute', top: 6, left: 8, opacity: 0.9 }}>#{index + 1}</span>
        <span aria-hidden style={{ fontSize: 18, marginRight: 8 }}>{style.icon}</span>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <strong style={{ fontSize: 14 }}>{item.name}</strong>
          <span style={{ fontSize: 12, opacity: 0.95 }}>{STATUS_LABEL[effectiveStatus]}</span>
        </div>
      </button>
    );
  };

  // Derived selected effective status for the bottom panel
  const selectedEffectiveStatus: StationStatus | null = selected ? getEffectiveStatus(selected.id, selected.status) : null;

  // Simple date control inline to allow changing date context from dashboard
  const DateControl: React.FC = () => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value; // YYYY-MM-DD
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        setDate(d);
      }
    };
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor="ctx-date" style={{ fontSize: 12, color: '#374151' }}>Data:</label>
        <input
          id="ctx-date"
          type="date"
          value={dateKey}
          onChange={handleChange}
          style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
        />
      </div>
    );
  };

  return (
    <div style={{ width: '100%', margin: '0 auto', padding: '1rem', maxWidth: 920 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <h2 style={{ marginBottom: '0.75rem' }}>Mappa postazioni</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DateControl />
          <button
            type="button"
            onClick={handleManualRefresh}
            aria-label="Aggiorna stato postazioni"
            title="Aggiorna stato postazioni"
            style={{ background: '#111827', color: '#fff', border: 0, borderRadius: 8, padding: '0.35rem 0.6rem' }}
          >
            Aggiorna
          </button>
        </div>
      </div>

      {toast ? (
        <div role="status" aria-live="polite" style={{ position: 'fixed', right: 16, top: 16, background: '#065f46', color: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: 8, boxShadow: '0 6px 16px rgba(0,0,0,0.25)', zIndex: 50 }}>
          {toast}
        </div>
      ) : null}

      {loading && (
        <div role="status" aria-live="polite" style={{ margin: '0.5rem 0' }}>
          <span style={srOnly}>Caricamento…</span>
          <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {error && (
        <div style={{ background: '#fde8e8', color: '#611a15', padding: '0.75rem', borderRadius: 8, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div>{error}</div>
          <button onClick={() => void reload()} style={{ background: '#111827', color: '#ffffff', border: 0, borderRadius: 6, padding: '0.4rem 0.6rem' }}>Riprova</button>
        </div>
      )}

      <div
        className="desk-grid"
        data-desk-grid
        style={{
          display: 'grid',
          gap: '0.75rem',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        }}
      >
        {stations.map((s, idx) => (
          <GridCell key={s.id} item={s} index={idx} />
        ))}
      </div>

      {/* Media query semplice inline: per compat garantiamo 4 colonne su viewports >= 768px */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 768px) {
          .desk-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }
      `}</style>

      {/* Panel info selezione */}
      <div style={{ marginTop: '1rem' }}>
        {selected ? (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span aria-hidden style={{ fontSize: 18 }}>{statusStyles[selectedEffectiveStatus || selected.status].icon}</span>
              <div>
                <div style={{ fontWeight: 700 }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: '#374151' }}>{STATUS_LABEL[selectedEffectiveStatus || selected.status]}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { setSelected(null); setShowConfirm(false); setConfirmError(null); }}
                style={{ background: '#e5e7eb', color: '#111827', border: 0, borderRadius: 6, padding: '0.5rem 0.75rem' }}
              >
                Chiudi
              </button>
              <button
                type="button"
                onClick={() => (selectedEffectiveStatus || selected.status) === 'FREE' ? setShowConfirm(true) : undefined}
                disabled={(selectedEffectiveStatus || selected.status) !== 'FREE'}
                style={{ background: (selectedEffectiveStatus || selected.status) === 'FREE' ? '#111827' : '#9ca3af', color: '#ffffff', border: 0, borderRadius: 6, padding: '0.5rem 0.75rem' }}
              >
                Prenota
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#6b7280' }}>Tocca una postazione libera per prenotare.</div>
        )}
      </div>

      {/* Nota accessibilità/legend */}
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {(['FREE','OCCUPIED','UNAVAILABLE'] as StationStatus[]).map(st => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden style={{ display: 'inline-flex', width: 12, height: 12, borderRadius: 3, background: statusStyles[st].bg, border: statusStyles[st].border }} />
            <span style={{ fontSize: 12 }}>{STATUS_LABEL[st]}</span>
          </div>
        ))}
      </div>

      {/* Modal conferma prenotazione */}
      <ConfirmBookingModal
        open={!!selected && showConfirm}
        stationName={selected?.name || ''}
        stationId={selected?.id}
        date={currentDate}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        bookingPreview={selected ? buildPreview(selected, currentDate) : undefined}
        onConfirmWithPreview={handleConfirmWithPreview}
        isConfirming={confirming}
        errorMessage={confirmError}
      />
    </div>
  );
};

export default DashboardPostazioni;
