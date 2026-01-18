import React, { useMemo, useState } from 'react';
import { DashboardPostazioni } from '../DashboardPostazioni';
import BookingConfirmationDialog, { BookingPreview } from './BookingConfirmationDialog';
import { createBooking } from '../../lib/bookings';
import { useAuth } from '../../lib/authContext';
import type { DeskStatus } from '../../lib/desksApi';

// Wrapper component that integrates the selection from map to popup opening
// Note: This example augments the existing DashboardPostazioni via onSelect.

export interface MapWithBookingFlowProps {
  baseUrl?: string;
  refreshMs?: number;
  onBooked?: (booking: { deskId: string; date: string; timeSlot?: string | null }) => void;
  // Optional callbacks for UI feedback
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function MapWithBookingFlow({ baseUrl = '', refreshMs = 15000, onBooked, onToast }: MapWithBookingFlowProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<BookingPreview | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localStatusMap, setLocalStatusMap] = useState<Record<string, DeskStatus>>({});
  const auth = useAuth();

  const handleSelect = (desk: { id: string; name: string }) => {
    const date = new Date();
    setPreview({ date, deskId: desk.id, deskName: desk.name });
    setErrorMessage(null);
    setDialogOpen(true);
  };

  const handleConfirm = async (p: BookingPreview) => {
    if (confirmLoading) return; // lock to avoid duplicates
    setConfirmLoading(true);
    setErrorMessage(null);
    try {
      const payload = {
        deskId: p.deskId,
        date: p.date.toISOString().slice(0, 10), // yyyy-mm-dd
        timeSlot: undefined as string | undefined,
      };
      const token = auth?.token || undefined;
      const booking = await createBooking(payload, token, baseUrl);

      // success feedback: immediate local color change to OCCUPIED for that desk
      setLocalStatusMap((prev) => ({ ...prev, [booking.deskId]: 'OCCUPIED' as DeskStatus }));
      onToast?.('Prenotazione confermata', 'success');
      onBooked?.({ deskId: booking.deskId, date: booking.date, timeSlot: booking.timeSlot });
      setDialogOpen(false);
    } catch (e: any) {
      const code = e?.code || e?.details?.code;
      if (code === 'COWORKING_CLOSED') {
        setErrorMessage('Non è possibile prenotare in questa data: il coworking è chiuso.');
        onToast?.('Non è possibile prenotare in questa data: il coworking è chiuso.', 'error');
      } else if (e?.status === 401) {
        setErrorMessage('Sessione scaduta. Eseguire il login.');
        onToast?.('Sessione scaduta. Eseguire il login.', 'error');
      } else {
        setErrorMessage(e?.message || 'Errore durante la prenotazione');
        onToast?.(e?.message || 'Errore durante la prenotazione', 'error');
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
  };

  const overrideStatuses = useMemo(() => localStatusMap, [localStatusMap]);

  return (
    <div>
      <DashboardPostazioni baseUrl={baseUrl} refreshMs={refreshMs} onSelect={handleSelect as any} overrideStatuses={overrideStatuses} />

      <BookingConfirmationDialog
        isOpen={dialogOpen}
        bookingPreview={preview}
        confirmLoading={confirmLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        initialFocus="confirm"
      />

      {errorMessage && (
        <div role="alert" className="mt-3 rounded bg-red-50 px-4 py-2 text-sm text-red-700" aria-live="assertive">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export default MapWithBookingFlow;
