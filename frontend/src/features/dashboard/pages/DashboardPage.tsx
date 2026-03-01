import React, { useMemo, useRef, useState } from 'react';
import '../../../assets/styles/dashboard.css';
import { LegendBar } from '../components/LegendBar';
import { StationDetail } from '../components/StationDetail';
import { StationsMap } from '../components/StationsMap';
import { Station, StationStatus, STATION_IDS } from '../types';
import { ConfirmBookingModal } from '../components/ConfirmBookingModal';
import { createBooking } from '../../booking/bookingApi';

function mockStations(): Station[] {
  // Simple mock: alternate statuses for visual
  const statuses: StationStatus[] = ['available', 'busy', 'unavailable'];
  const now = new Date().toISOString();
  return STATION_IDS.map((id, i) => ({ id, status: statuses[i % statuses.length], updatedAt: now }));
}

export const DashboardPage: React.FC = () => {
  // Selected station and date (today by default)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDate] = useState<Date>(() => new Date());
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Base stations loaded from server (here: mock)
  const [baseStations, setBaseStations] = useState<Station[]>(() => mockStations());

  // Local overlay to immediately reflect bookings per date without full reload
  // Map: ISO date (YYYY-MM-DD) -> { [stationId]: StationStatus }
  const [overridesByDate, setOverridesByDate] = useState<Record<string, Record<string, StationStatus>>>({});

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Compute stations shown by applying local overrides for the selected date
  const selectedDateIso = useMemo(() => {
    const d = selectedDate;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [selectedDate]);

  const stations: Station[] = useMemo(() => {
    const overrides = overridesByDate[selectedDateIso] || {};
    const nowIso = new Date().toISOString();
    return baseStations.map((s) => (overrides[s.id]
      ? { ...s, status: overrides[s.id], updatedAt: nowIso }
      : s
    ));
  }, [baseStations, overridesByDate, selectedDateIso]);

  const selected = useMemo(() => stations.find((s) => s.id === selectedId) || null, [stations, selectedId]);

  const onRefresh = () => {
    // Placeholder: in future call API and update lastUpdated and baseStations from server
    const fresh = mockStations();
    setBaseStations(fresh);
    // Rollback local overrides on manual refresh to re-sync with server
    setOverridesByDate({});
    setLastUpdated(new Date().toISOString());
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const station = stations.find((s) => s.id === id);
    // Open confirmation only for available stations
    if (station?.status === 'available') {
      setConfirmOpen(true);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmOpen(false);
  };

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  }

  const handleConfirmPreview = async (payload: { stationId: string; stationName?: string | null; date: Date; dateIso: string; timeSlot?: string | null }) => {
    // Optimistic update pattern (disabled by default). We update after success to avoid rollback complexity.
    try {
      // Call backend API to create booking
      await createBooking({ stationId: payload.stationId, date: payload.dateIso, timeSlot: payload.timeSlot || undefined });
      // Update local overlay for the specific date only
      setOverridesByDate((prev) => ({
        ...prev,
        [payload.dateIso]: {
          ...(prev[payload.dateIso] || {}),
          [payload.stationId]: 'busy',
        },
      }));
      setConfirmOpen(false);
      setLastUpdated(new Date().toISOString());
      showToast('Prenotazione confermata');
    } catch (err: any) {
      // Specific handling for closed day
      const code = err?.data?.code;
      if (code === 'COWORKING_CLOSED') {
        throw new Error('Non è possibile prenotare in questa data: il coworking è chiuso.');
      }
      // Other known validations could be handled here (e.g., ALREADY_BOOKED)
      const msg: string = err?.data?.message || err?.message || 'Errore durante la prenotazione. Riprova.';
      throw new Error(msg);
    }
  };

  return (
    <section className="dashboard">
      <header className="header">
        <h1 style={{ margin: 0, fontSize: '1.1rem' }}>Mappa postazioni</h1>
        <button className="icon-btn" aria-label="Aggiorna stato postazioni" onClick={onRefresh}>⟳</button>
      </header>

      <div className="map-wrapper">
        <StationsMap stations={stations} selectedId={selectedId} onSelect={handleSelect} />
        {/* Fallback list for very small screens */}
        <div className="fallback-list" aria-label="Lista postazioni (fallback)">
          {stations.map((s) => (
            <div key={s.id} className="row">
              <div className="state">
                <span className={`dot ${s.status}`} aria-hidden="true" /> {s.id}
              </div>
              <div>
                <button className="btn" onClick={() => handleSelect(s.id)} disabled={s.status !== 'available'}>
                  {s.status === 'available' ? 'Prenota' : 'Non disponibile'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <LegendBar updatedAt={lastUpdated} />

      {/* Detail panel: bottom sheet on mobile. On wide screens, could be rendered in a side panel container */}
      {!confirmOpen && <StationDetail station={selected} onClose={() => setSelectedId(null)} />}

      {/* Confirmation modal */}
      <ConfirmBookingModal
        open={confirmOpen}
        preview={{ stationId: selectedId || '', stationName: selected?.name ?? null, date: selectedDate }}
        onCancel={handleCancelConfirm}
        onConfirmPreview={handleConfirmPreview}
      />

      {/* Simple toast notification */}
      {toast && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 24, background: '#065F46', color: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.2)', zIndex: 1100 }}>
          {toast}
        </div>
      )}
    </section>
  );
};
