import React from 'react';

export type BookingPreview = {
  idPostazione: string;
  numeroPostazione: string; // readable label/number
  dataPrenotazione: Date;
  piano?: string | null;
  edificio?: string | null;
};

export type ConfirmBookingModalProps = {
  open: boolean;
  // Backward-compat props
  stationName: string;
  stationId?: string;
  date: Date; // booking date (date-only semantics)
  onCancel: () => void;
  onConfirm: () => void;
  // New props (optional) to support richer booking preview and async confirming
  bookingPreview?: BookingPreview;
  onConfirmWithPreview?: (preview: BookingPreview) => void | Promise<void>;
  isConfirming?: boolean; // disables Confirm button and shows loading state
  confirmLabel?: string;
  cancelLabel?: string;
  // Optional error message to display inside the modal (e.g., validation or conflict)
  errorMessage?: string | null;
};

function formatDateIT(d: Date): string {
  try {
    return d.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d.toLocaleDateString('it-IT');
  }
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(17, 24, 39, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  width: 'min(92vw, 420px)',
  boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '1rem 1rem 0.5rem 1rem',
};

const bodyStyle: React.CSSProperties = {
  padding: '0 1rem 1rem 1rem',
  color: '#374151',
  fontSize: 14,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.5rem',
  padding: '0.75rem 1rem 1rem',
};

const btnBase: React.CSSProperties = {
  border: 0,
  borderRadius: 8,
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
};

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 16,
  height: 16,
  border: '2px solid #ffffff',
  borderRightColor: 'transparent',
  borderRadius: '50%',
  marginRight: 8,
  animation: 'spin 1s linear infinite',
};

const errorBoxStyle: React.CSSProperties = {
  background: '#fde8e8',
  color: '#611a15',
  border: '1px solid #f3b8b8',
  borderRadius: 8,
  padding: '0.5rem 0.75rem',
  marginTop: '0.5rem',
  fontSize: 13,
};

const ConfirmBookingModal: React.FC<ConfirmBookingModalProps> = ({
  open,
  stationName,
  stationId,
  date,
  onCancel,
  onConfirm,
  bookingPreview,
  onConfirmWithPreview,
  isConfirming,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  errorMessage,
}) => {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const confirmBtnRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (open) {
      const prev = document.activeElement as HTMLElement | null;
      // Focus the dialog container for screen readers, then move to confirm button for action
      dialogRef.current?.focus();
      // defer focusing confirm for better UX
      const t = window.setTimeout(() => confirmBtnRef.current?.focus(), 50);
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', handler);
      return () => {
        document.removeEventListener('keydown', handler);
        window.clearTimeout(t);
        prev?.focus?.();
      };
    }
  }, [open, onCancel]);

  if (!open) return null;

  const effective = bookingPreview ?? {
    idPostazione: stationId || '',
    numeroPostazione: stationName,
    dataPrenotazione: date,
  };

  const handleConfirmClick = () => {
    if (onConfirmWithPreview && effective) {
      onConfirmWithPreview(effective);
    } else {
      onConfirm();
    }
  };

  return (
    <div style={overlayStyle} aria-hidden={!open}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-booking-title"
        aria-busy={!!isConfirming}
        tabIndex={-1}
        style={modalStyle}
      >
        <div style={headerStyle}>
          <h3 id="confirm-booking-title" style={{ margin: 0 }}>Confermare prenotazione?</h3>
        </div>
        <div style={bodyStyle}>
          <p style={{ marginTop: 0 }}>Stai per prenotare la seguente postazione:</p>
          <ul style={{ margin: 0, padding: '0 0 0 1.1rem' }}>
            <li><strong>Data:</strong> {formatDateIT(effective.dataPrenotazione)}</li>
            <li><strong>Postazione:</strong> {effective.numeroPostazione}{effective.idPostazione ? ` (#${effective.idPostazione})` : ''}</li>
            {effective.piano ? <li><strong>Piano:</strong> {effective.piano}</li> : null}
            {effective.edificio ? <li><strong>Edificio:</strong> {effective.edificio}</li> : null}
          </ul>
          <p style={{ fontSize: 12, color: '#6b7280' }}>Verifica le informazioni prima di confermare. Potrai modificare o annullare la prenotazione secondo le policy del coworking.</p>
          {errorMessage ? (
            <div role="alert" aria-live="assertive" style={errorBoxStyle}>
              {errorMessage}
            </div>
          ) : null}
        </div>
        <div style={footerStyle}>
          <button
            type="button"
            onClick={onCancel}
            style={{ ...btnBase, background: '#e5e7eb', color: '#111827' }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirmClick}
            disabled={!!isConfirming}
            aria-disabled={!!isConfirming}
            style={{ ...btnBase, background: isConfirming ? '#6b7280' : '#111827', color: '#ffffff', opacity: isConfirming ? 0.9 : 1 }}
          >
            {isConfirming ? <span aria-hidden style={spinnerStyle} /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
      {/* Local keyframes for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ConfirmBookingModal;
