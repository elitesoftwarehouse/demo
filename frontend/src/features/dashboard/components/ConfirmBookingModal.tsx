import React, { useEffect, useMemo, useRef, useState } from 'react';

export type BookingPreview = {
  stationId: string;
  stationName?: string | null;
  date: Date; // booking date (local)
  building?: string | null;
  floor?: string | null;
  // Optional time slot identifier (e.g., 'AM', 'PM', '09-13')
  timeSlot?: string | null;
};

export type ConfirmBookingModalProps = {
  open: boolean;
  // New: provide a single preview object with all the info
  preview?: BookingPreview;
  // Backward-compatibility: the following props are still supported if preview is not provided
  stationId?: string;
  stationName?: string | null;
  // If provided, use this date; otherwise fallback to today
  date?: Date | null;
  building?: string | null;
  floor?: string | null;
  onConfirm?: (payload: { stationId: string; dateIso: string }) => Promise<void> | void;
  // New: richer callback returning the entire preview + computed ISO
  onConfirmPreview?: (payload: BookingPreview & { dateIso: string }) => Promise<void> | void;
  onCancel?: () => void;
};

function formatDateIT(date: Date): string {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const ConfirmBookingModal: React.FC<ConfirmBookingModalProps> = ({
  open,
  preview,
  stationId: stationIdProp,
  stationName: stationNameProp,
  date: dateProp,
  building: buildingProp,
  floor: floorProp,
  onConfirm,
  onConfirmPreview,
  onCancel,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve preview data from either the preview prop or individual props
  const effectivePreview: BookingPreview = useMemo(() => {
    if (preview) return preview;
    const date = dateProp ?? new Date();
    return {
      stationId: stationIdProp || '',
      stationName: stationNameProp ?? null,
      date,
      building: buildingProp ?? null,
      floor: floorProp ?? null,
      timeSlot: null,
    };
  }, [preview, stationIdProp, stationNameProp, dateProp, buildingProp, floorProp]);

  const bookingDate = useMemo(() => effectivePreview.date ?? new Date(), [effectivePreview.date]);
  const pretty = formatDateIT(bookingDate);
  const dateIso = toIsoDate(bookingDate);

  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
      return;
    }
    // Focus management: try focus confirm button first, otherwise title
    const t = setTimeout(() => {
      if (confirmBtnRef.current) confirmBtnRef.current.focus();
      else if (titleRef.current) titleRef.current.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
      if (e.key === 'Tab') {
        // Simple focus trap between cancel and confirm
        const focusable: HTMLElement[] = [cancelBtnRef.current, confirmBtnRef.current]
          .filter(Boolean) as HTMLElement[];
        if (focusable.length === 0) return;
        const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey) {
          if (currentIndex <= 0) {
            e.preventDefault();
            focusable[focusable.length - 1].focus();
          }
        } else {
          if (currentIndex === -1 || currentIndex >= focusable.length - 1) {
            e.preventDefault();
            focusable[0].focus();
          }
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const { stationId, stationName, building, floor, timeSlot } = effectivePreview;
  const titleId = 'confirm-booking-title';
  const descId = 'confirm-booking-desc';

  const handleConfirm = async () => {
    if (submitting) return; // guard against double-click
    setError(null);
    try {
      setSubmitting(true);
      if (onConfirmPreview) {
        await onConfirmPreview({ ...effectivePreview, dateIso });
      } else {
        await onConfirm?.({ stationId, dateIso });
      }
    } catch (e: any) {
      // Show specific message if provided by parent
      setError(e?.message || 'Errore temporaneo, riprova');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="bottom-sheet"
        style={{ paddingBottom: 24, zIndex: 1000 }}
      >
        <h2 id={titleId} ref={titleRef} tabIndex={-1} style={{ marginTop: 0 }}>Confermi prenotazione?</h2>
        <p id={descId} style={{ marginBottom: 12 }}>
          Stai prenotando la postazione <strong>{stationId}{stationName ? ` — ${stationName}` : ''}</strong>
          {' '}per il giorno <strong>{pretty}</strong>{timeSlot ? ` (fascia ${timeSlot})` : ''}.
        </p>
        {(building || floor) && (
          <p style={{ marginTop: -8, marginBottom: 12, color: '#4B5563' }}>
            {building && <><strong>Edificio:</strong> {building} </>}
            {floor && <><strong>Piano:</strong> {floor}</>}
          </p>
        )}
        {error && <div role="alert" aria-live="polite" style={{ color: '#DC2626', marginBottom: 8 }}>{error}</div>}
        <div className="actions">
          <button ref={cancelBtnRef} className="btn" onClick={onCancel} disabled={submitting}>Annulla</button>
          <button ref={confirmBtnRef} className="btn primary" onClick={handleConfirm} disabled={submitting}>{submitting ? 'Conferma…' : 'Conferma'}</button>
        </div>
      </div>
    </>
  );
};
