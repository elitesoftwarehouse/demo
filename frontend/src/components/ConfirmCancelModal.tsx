import React from 'react';

export type ConfirmCancelModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isConfirming?: boolean;
  errorMessage?: string | null;
  // Minimal booking info for context
  dateLabel?: string; // e.g., "Lunedì 12/03/2026"
  deskLabel?: string; // e.g., "Postazione 7"
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(17,24,39,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};
const modalStyle: React.CSSProperties = {
  background: '#ffffff', borderRadius: 12, width: 'min(92vw, 420px)',
  boxShadow: '0 10px 25px rgba(0,0,0,0.25)', overflow: 'hidden',
};
const headerStyle: React.CSSProperties = { padding: '1rem 1rem 0.5rem' };
const bodyStyle: React.CSSProperties = { padding: '0 1rem 1rem', color: '#374151', fontSize: 14 };
const footerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.75rem 1rem 1rem' };
const btnBase: React.CSSProperties = { border: 0, borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer' };
const spinnerStyle: React.CSSProperties = { display: 'inline-block', width: 16, height: 16, border: '2px solid #ffffff', borderRightColor: 'transparent', borderRadius: '50%', marginRight: 8, animation: 'spin 1s linear infinite' };
const errorBoxStyle: React.CSSProperties = { background: '#fde8e8', color: '#611a15', border: '1px solid #f3b8b8', borderRadius: 8, padding: '0.5rem 0.75rem', marginTop: '0.5rem', fontSize: 13 };

const ConfirmCancelModal: React.FC<ConfirmCancelModalProps> = ({ open, onCancel, onConfirm, isConfirming, errorMessage, dateLabel, deskLabel }) => {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const confirmBtnRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (open) {
      const prev = document.activeElement as HTMLElement | null;
      dialogRef.current?.focus();
      const t = window.setTimeout(() => confirmBtnRef.current?.focus(), 50);
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
      document.addEventListener('keydown', handler);
      return () => { document.removeEventListener('keydown', handler); window.clearTimeout(t); prev?.focus?.(); };
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div style={overlayStyle} aria-hidden={!open}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-cancel-title" aria-busy={!!isConfirming} tabIndex={-1} style={modalStyle}>
        <div style={headerStyle}>
          <h3 id="confirm-cancel-title" style={{ margin: 0 }}>Confermi l'annullamento?</h3>
        </div>
        <div style={bodyStyle}>
          <p style={{ marginTop: 0 }}>Stai per cancellare la prenotazione seguente:</p>
          <ul style={{ margin: 0, padding: '0 0 0 1.1rem' }}>
            {dateLabel ? <li><strong>Data:</strong> {dateLabel}</li> : null}
            {deskLabel ? <li><strong>Postazione:</strong> {deskLabel}</li> : null}
          </ul>
          <p style={{ fontSize: 12, color: '#6b7280' }}>Ricorda: la cancellazione è consentita solo se mancano più di 24 ore all'orario di utilizzo.</p>
          {errorMessage ? (
            <div role="alert" aria-live="assertive" style={errorBoxStyle}>{errorMessage}</div>
          ) : null}
        </div>
        <div style={footerStyle}>
          <button type="button" onClick={onCancel} style={{ ...btnBase, background: '#e5e7eb', color: '#111827' }}>Annulla</button>
          <button ref={confirmBtnRef} type="button" onClick={onConfirm} disabled={!!isConfirming} aria-disabled={!!isConfirming} style={{ ...btnBase, background: isConfirming ? '#6b7280' : '#DC2626', color: '#ffffff' }}>
            {isConfirming ? <span aria-hidden style={spinnerStyle} /> : null}
            Conferma cancellazione
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ConfirmCancelModal;
