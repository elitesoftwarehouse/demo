import React, { useMemo, useState } from 'react';
import { createBooking } from '../../lib/bookings';
import { useDesksActions } from '../../lib/desksState';

export interface BookingPopupProps {
  open: boolean;
  baseUrl?: string;
  deskId: string;
  deskLabel: string;
  date: Date | string; // date selected
  onClose?: () => void;
  onBooked?: (bookingId: string) => void;
}

function toDateKey(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const BookingPopup: React.FC<BookingPopupProps> = ({ open, baseUrl = '', deskId, deskLabel, date, onClose, onBooked }) => {
  const { markBookedOptimistic, setDeskStatus } = useDesksActions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = useMemo(() => toDateKey(date), [date]);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    const { rollback } = markBookedOptimistic(deskId, day);
    try {
      const res = await createBooking(baseUrl, { deskId, date: day });
      // Ensure status remains occupied according to server success
      setDeskStatus(deskId, 'OCCUPIED', day);
      onBooked?.(res.id);
      onClose?.();
    } catch (e: any) {
      rollback();
      setError(e?.message || 'Errore nella prenotazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Conferma prenotazione" style={{ padding: 16, border: '1px solid #ccc', borderRadius: 8, background: '#fff' }}>
      <div style={{ marginBottom: 8 }}>Confermi la prenotazione della postazione {deskLabel} per il {day}?</div>
      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} disabled={loading}>Annulla</button>
        <button onClick={handleConfirm} disabled={loading} style={{ background: '#16a34a', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>
          {loading ? 'Salvataggio…' : 'Conferma'}
        </button>
      </div>
      <div aria-live="polite" style={{ marginTop: 8, fontSize: 12, color: '#555' }}>
        Stato: {loading ? 'in corso…' : 'in attesa'}
      </div>
    </div>
  );
};

export default BookingPopup;
