import React, { useCallback, useMemo, useState } from 'react';
import { createBooking, type CreateDeskBookingRequest } from '../../api/bookingClient';
import { dispatchBookingCreated } from '../../events/bookingEvents';

export type BookingConfirmationDialogProps = {
  isOpen: boolean;
  deskId: string | null;
  date: string | null; // YYYY-MM-DD
  baseUrl?: string;
  onClose: () => void;
  onSuccess?: (bookingId: string) => void;
};

export const BookingConfirmationDialog: React.FC<BookingConfirmationDialogProps> = ({
  isOpen,
  deskId,
  date,
  baseUrl,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!isOpen && !!deskId && !!date, [isOpen, deskId, date]);

  const handleConfirm = useCallback(async () => {
    if (!canSubmit || !deskId || !date) return;
    setSubmitting(true);
    setError(null);

    const payload: CreateDeskBookingRequest = {
      deskId,
      date,
    } as any;

    try {
      const res = await createBooking(payload, { baseUrl });
      // Dispatch UI event to update desks grid immediately
      dispatchBookingCreated({ deskId, date });
      // Optional: expose success for toasts
      onSuccess?.(res.bookingId);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'booking.create_failed');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, deskId, date, baseUrl, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-label="Conferma prenotazione" className="booking-dialog">
      <div className="booking-dialog__content">
        <h2>Prenota postazione</h2>
        <p>
          Confermi la prenotazione della postazione <strong>{deskId}</strong> per il giorno{' '}
          <strong>{date}</strong>?
        </p>
        {error && (
          <div role="alert" className="booking-dialog__error" aria-live="assertive">
            {error}
          </div>
        )}
        <div className="booking-dialog__actions">
          <button onClick={onClose} disabled={submitting} aria-label="Annulla prenotazione">
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
            aria-label="Conferma prenotazione"
          >
            {submitting ? 'Salvataggio…' : 'Conferma'}
          </button>
        </div>
        <div className="booking-dialog__legend" aria-label="Legenda disponibilità">
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
      </div>
    </div>
  );
};
