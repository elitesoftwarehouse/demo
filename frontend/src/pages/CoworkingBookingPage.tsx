import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cancelBooking, createBooking, getBookingMap, BookingMapDesk } from '../lib/api';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isWeekend(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  const wd = dt.getDay();
  return wd === 0 || wd === 6;
}

function diffFromStart(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10));
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  return start - Date.now();
}

const Spinner: React.FC = () => (
  <div style={{ textAlign: 'center', padding: 16 }}>Caricamento...</div>
);

const Toast: React.FC<{ message: string; type?: 'success' | 'error'; onClose?: () => void }> = ({ message, type = 'success', onClose }) => {
  return (
    <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: type === 'success' ? '#16a34a' : '#ef4444', color: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} onClick={onClose}>
      {message}
    </div>
  );
};

export const CoworkingBookingPage: React.FC = () => {
  const [date, setDate] = useState<string>(() => {
    const today = toDateKey(new Date());
    // If today is weekend, move to next Monday
    if (isWeekend(today)) {
      const dt = new Date();
      const add = dt.getDay() === 6 ? 2 : 1; // Sat -> +2, Sun -> +1
      dt.setDate(dt.getDate() + add);
      return toDateKey(dt);
    }
    return today;
  });
  const [map, setMap] = useState<BookingMapDesk[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);

  const hasMyBooking = useMemo(() => map?.some((d) => d.myBooking) ?? false, [map]);
  const myBooking = useMemo(() => map?.find((d) => d.myBooking), [map]);

  const canCancelMyBooking = useMemo(() => {
    if (!myBooking) return false;
    if (!myBooking.bookingId) return false;
    // Allow cancel if >24h before
    return diffFromStart(date) > 24 * 60 * 60 * 1000;
  }, [myBooking, date]);

  const fetchMap = useCallback(async (d: string) => {
    if (!dateRegex.test(d)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getBookingMap(d);
      setMap(res.desks);
    } catch (e: any) {
      setError(e?.body?.error || e?.message || 'Errore di rete');
      setMap(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMap(date);
  }, [date, fetchMap]);

  function onDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // prevent selecting weekends
    if (val && isWeekend(val)) {
      setToast({ msg: 'Seleziona un giorno feriale (Lun-Ven)', type: 'error' });
      return;
    }
    setDate(val);
  }

  const onSelectDesk = async (deskId: number) => {
    if (hasMyBooking) return;
    try {
      await createBooking(deskId, date);
      setToast({ msg: 'Prenotazione creata', type: 'success' });
      await fetchMap(date);
    } catch (e: any) {
      const status = e?.status;
      let msg = e?.body?.error || e?.message || 'Errore';
      if (status === 409) msg = 'Postazione non disponibile o prenotazione già esistente';
      if (status === 400) msg = e?.body?.error || 'Data non prenotabile';
      if (status === 404) msg = 'Postazione non trovata';
      setToast({ msg, type: 'error' });
    }
  };

  const onCancelMyBooking = async () => {
    if (!myBooking?.bookingId) return;
    try {
      await cancelBooking(myBooking.bookingId);
      setToast({ msg: 'Prenotazione annullata', type: 'success' });
      await fetchMap(date);
    } catch (e: any) {
      const status = e?.status;
      let msg = e?.body?.error || e?.message || 'Errore';
      if (status === 403) msg = 'Non consentito annullare questa prenotazione';
      if (status === 409) msg = 'La prenotazione non è annullabile entro 24 ore';
      setToast({ msg, type: 'error' });
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Prenotazione coworking</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ fontWeight: 600 }}>Data:</label>
        <input
          type="date"
          value={date}
          onChange={onDateChange}
          style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
          {toDateKey(new Date()) === date ? 'Oggi' : isWeekend(date) ? 'Weekend (non prenotabile)' : 'Giorno feriale'}
        </span>
      </div>

      {loading && <Spinner />}
      {error && (
        <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>
      )}

      {!loading && map && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {map.sort((a, b) => a.id - b.id).map((d) => {
            const isMine = d.myBooking;
            const isFree = !d.occupied;
            const canBook = isFree && !hasMyBooking;
            return (
              <button
                key={d.id}
                onClick={() => canBook && onSelectDesk(d.id)}
                disabled={!canBook}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  aspectRatio: '1 / 1',
                  padding: 12,
                  borderRadius: 12,
                  border: isMine ? '3px solid #0ea5e9' : '2px solid #e2e8f0',
                  background: isFree ? '#ecfeff' : '#e2e8f0',
                  color: '#0f172a',
                  cursor: canBook ? 'pointer' : 'default',
                }}
                title={isFree ? 'Disponibile' : isMine ? 'Prenotata da te' : 'Occupata'}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>{d.code}</div>
                <div style={{ fontSize: 12, color: '#334155' }}>{d.label}</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {isFree ? 'Libera' : isMine ? 'La tua prenotazione' : 'Occupata'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {myBooking && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>La tua prenotazione: <strong>{myBooking.code}</strong> per il {date}</span>
          <button
            onClick={onCancelMyBooking}
            disabled={!canCancelMyBooking}
            style={{
              padding: '8px 12px',
              background: canCancelMyBooking ? '#ef4444' : '#94a3b8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: canCancelMyBooking ? 'pointer' : 'not-allowed',
            }}
          >
            Annulla prenotazione
          </button>
        </div>
      )}

      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default CoworkingBookingPage;
