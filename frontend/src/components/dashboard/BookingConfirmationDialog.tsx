import React, { useEffect, useMemo, useRef } from 'react';

export interface BookingPreview {
  date: Date; // data prenotazione
  deskId: string;
  deskName: string; // numero/nome postazione
  floor?: string | number;
  building?: string;
  timeSlot?: string | null; // opzionale fascia oraria
}

export interface BookingConfirmationDialogProps {
  isOpen: boolean;
  bookingPreview: BookingPreview | null;
  confirmLoading?: boolean;
  onConfirm: (preview: BookingPreview) => void | Promise<void>;
  onCancel: () => void;
  initialFocus?: 'title' | 'confirm';
}

// Basic, accessible modal dialog with ESC to close and focus management
export function BookingConfirmationDialog({
  isOpen,
  bookingPreview,
  confirmLoading = false,
  onConfirm,
  onCancel,
  initialFocus = 'title',
}: BookingConfirmationDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const dialogId = useMemo(() => `dialog-${Math.random().toString(36).slice(2)}` , []);
  const titleId = `${dialogId}-title`;
  const descId = `${dialogId}-desc`;

  useEffect(() => {
    if (!isOpen) return;

    const toFocus = initialFocus === 'confirm' ? confirmBtnRef.current : titleRef.current;
    toFocus?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel, initialFocus]);

  if (!isOpen || !bookingPreview) return null;

  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'it-IT';
  const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const dateStr = dateFmt.format(bookingPreview.date);

  const onBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleConfirm = () => {
    onConfirm(bookingPreview);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onMouseDown={onBackdropClick}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-lg focus:outline-none" onMouseDown={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="text-lg font-semibold text-gray-900">
            Confermare prenotazione?
          </h2>
          <p id={descId} className="mt-2 text-sm text-gray-600">
            Verifica i dettagli e conferma per prenotare la postazione selezionata.
          </p>
        </div>

        <div className="px-5 py-4">
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <dt className="col-span-1 text-gray-500">Data</dt>
            <dd className="col-span-2 text-gray-900" data-testid="booking-date">{dateStr}</dd>

            <dt className="col-span-1 text-gray-500">Postazione</dt>
            <dd className="col-span-2 text-gray-900" data-testid="booking-desk">{bookingPreview.deskName}</dd>

            {bookingPreview.floor !== undefined && (
              <>
                <dt className="col-span-1 text-gray-500">Piano</dt>
                <dd className="col-span-2 text-gray-900" data-testid="booking-floor">{String(bookingPreview.floor)}</dd>
              </>
            )}

            {bookingPreview.building && (
              <>
                <dt className="col-span-1 text-gray-500">Edificio</dt>
                <dd className="col-span-2 text-gray-900" data-testid="booking-building">{bookingPreview.building}</dd>
              </>
            )}

            {bookingPreview.timeSlot && (
              <>
                <dt className="col-span-1 text-gray-500">Fascia oraria</dt>
                <dd className="col-span-2 text-gray-900" data-testid="booking-timeslot">{bookingPreview.timeSlot}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="px-5 pb-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onCancel}
          >
            Annulla
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${confirmLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={handleConfirm}
            disabled={!!confirmLoading}
            aria-busy={!!confirmLoading}
            autoFocus={initialFocus === 'confirm'}
          >
            {confirmLoading ? 'Conferma…' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingConfirmationDialog;
