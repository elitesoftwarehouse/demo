import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiDelete, apiGet, apiPost } from '../api/client';

interface PostazioneDto {
  id: number;
  label: string;
  row: number;
  col: number;
  stato: 'LIBERA' | 'OCCUPATA';
  prenotataDaMe: boolean;
  idPrenotazioneUtente?: string;
}

interface MappaResponse {
  data: string; // YYYY-MM-DD
  postazioni: PostazioneDto[];
}

function toDateOnly(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateOnly(s: string) {
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function isWeekend(d: Date) {
  const wd = d.getDay(); // 0=Sun, 6=Sat
  return wd === 0 || wd === 6;
}

function isWorkingDayStr(dateOnly: string) {
  return !isWeekend(parseDateOnly(dateOnly));
}

function addDays(dateOnly: string, delta: number) {
  const d = parseDateOnly(dateOnly);
  d.setDate(d.getDate() + delta);
  return toDateOnly(d);
}

function nextWorkingDay(dateOnly: string, dir: 1 | -1) {
  let d = dateOnly;
  do {
    d = addDays(d, dir);
  } while (!isWorkingDayStr(d));
  return d;
}

function startOfDayMs(dateOnly: string) {
  const d = parseDateOnly(dateOnly);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function CoworkingPage() {
  // Default date: today if working day, else next working day
  const today = useMemo(() => toDateOnly(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return isWorkingDayStr(today) ? today : nextWorkingDay(today, 1);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mappa, setMappa] = useState<MappaResponse | null>(null);

  const refresh = useCallback(async (dateOnly: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<MappaResponse>(`/coworking/postazioni?data=${dateOnly}`);
      setMappa(data);
    } catch (e: any) {
      setError(e?.message || 'Errore di rete');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(selectedDate);
  }, [selectedDate, refresh]);

  const userHasBooking = useMemo(() => {
    return mappa?.postazioni?.some((p) => p.prenotataDaMe) || false;
  }, [mappa]);

  const myBooking = useMemo(() => {
    return mappa?.postazioni?.find((p) => p.prenotataDaMe);
  }, [mappa]);

  const canCancel = useMemo(() => {
    const THRESHOLD = 24 * 60 * 60 * 1000;
    const diff = startOfDayMs(selectedDate) - Date.now();
    return diff > THRESHOLD;
  }, [selectedDate]);

  const onPrev = () => setSelectedDate((d) => nextWorkingDay(d, -1));
  const onNext = () => setSelectedDate((d) => nextWorkingDay(d, 1));

  const onPickDate = (value: string) => {
    if (!value) return;
    const w = isWorkingDayStr(value) ? value : nextWorkingDay(value, 1);
    setSelectedDate(w);
  };

  const onBook = async (deskId: number) => {
    try {
      await apiPost<any>('/coworking/prenotazioni', {
        data: selectedDate,
        postazioneId: deskId,
      });
      setToast('Prenotazione creata con successo');
      await refresh(selectedDate);
    } catch (e: any) {
      const code = e?.code;
      const msg =
        code === 'USER_ALREADY_BOOKED'
          ? 'Hai già una prenotazione per questa data'
          : code === 'DESK_ALREADY_BOOKED'
          ? 'Postazione già prenotata'
          : code === 'NON_WORKING_DAY'
          ? 'Prenotazioni consentite solo nei giorni feriali'
          : e?.message || 'Errore nella creazione della prenotazione';
      setToast(msg);
    }
  };

  const onCancel = async (bookingId?: string) => {
    if (!bookingId) return;
    try {
      await apiDelete<any>(`/coworking/prenotazioni/${bookingId}`);
      setToast('Prenotazione annullata');
      await refresh(selectedDate);
    } catch (e: any) {
      const code = e?.code;
      const msg =
        code === 'CANCELLATION_WINDOW_PASSED'
          ? 'Non è possibile annullare a meno di 24 ore dalla data'
          : e?.message || 'Errore nella cancellazione';
      setToast(msg);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const grid = useMemo(() => {
    const items = mappa?.postazioni || [];
    const byCoord = new Map<string, PostazioneDto>();
    for (const p of items) byCoord.set(`${p.row}-${p.col}`, p);

    const rows = 2;
    const cols = 3;
    const list: PostazioneDto[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = `${r}-${c}`;
        const p = byCoord.get(k);
        if (p) list.push(p);
      }
    }
    return list;
  }, [mappa]);

  return (
    <div style={container}>
      <h2 style={title}>Prenotazione coworking</h2>

      <div style={controls}>
        <button onClick={onPrev} style={button}>◀</button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onPickDate((e.target as HTMLInputElement).value)}
          style={dateInput(isWorkingDayStr(selectedDate), selectedDate === today)}
        />
        <button onClick={onNext} style={button}>▶</button>
      </div>
      <div style={legend}>
        <span style={{ ...pill, background: '#e2fbe2', borderColor: '#2f7a2f' }}>Libera</span>
        <span style={{ ...pill, background: '#fde2e2', borderColor: '#a12b2b' }}>Occupata</span>
        <span style={{ ...pill, background: '#e0e7ff', borderColor: '#4338ca' }}>Mia</span>
        {!isWorkingDayStr(selectedDate) && (
          <span style={{ marginLeft: 8, color: 'crimson' }}>Seleziona un giorno feriale</span>
        )}
      </div>

      {loading && <div style={loadingBox}>Caricamento mappa…</div>}
      {error && <div style={errorBox}>Errore: {error}</div>}

      {!loading && !error && (
        <div style={gridStyle}>
          {grid.map((p) => {
            const isFree = p.stato === 'LIBERA';
            const isMine = p.prenotataDaMe;
            const canBook = isFree && !userHasBooking;
            return (
              <div
                key={p.id}
                style={deskCard(isFree, isMine)}
                aria-label={`Postazione ${p.label} ${p.stato}`}
              >
                <div style={deskHeader}>
                  <span>{p.label}</span>
                  {isMine && <span style={mineBadge}>Mia</span>}
                </div>
                <div style={deskStatus(isFree)}>{isFree ? 'Libera' : 'Occupata'}</div>
                <div style={{ marginTop: 12 }}>
                  {isMine ? (
                    <button
                      style={cancelBtn(canCancel)}
                      onClick={() => onCancel(p.idPrenotazioneUtente)}
                      disabled={!canCancel}
                    >
                      {canCancel ? 'Annulla prenotazione' : 'Annulla (non disponibile)'}
                    </button>
                  ) : isFree ? (
                    <button style={bookBtn(canBook)} disabled={!canBook} onClick={() => onBook(p.id)}>
                      Prenota
                    </button>
                  ) : (
                    <span style={{ color: '#6b7280' }}>Non disponibile</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && <div style={toastBox}>{toast}</div>}
    </div>
  );
}

// Styles
const container: React.CSSProperties = { padding: 16, maxWidth: 720, margin: '0 auto' };
const title: React.CSSProperties = { fontSize: 22, marginBottom: 12 };
const controls: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const button: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #d1d5db',
  background: 'white',
  borderRadius: 6,
  cursor: 'pointer',
};
const dateInput = (working: boolean, isToday: boolean): React.CSSProperties => ({
  padding: '6px 8px',
  border: `2px solid ${isToday ? '#0ea5e9' : '#d1d5db'}`,
  background: working ? '#fff' : '#fff7ed',
  borderRadius: 6,
});
const legend: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 };
const pill: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 999,
  border: '1px solid',
  fontSize: 12,
};
const loadingBox: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  background: '#f3f4f6',
  borderRadius: 8,
};
const errorBox: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  background: '#fee2e2',
  border: '1px solid #b91c1c',
  color: '#7f1d1d',
  borderRadius: 8,
};
const gridStyle: React.CSSProperties = {
  marginTop: 16,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 12,
};
const deskCard = (free: boolean, mine: boolean): React.CSSProperties => ({
  border: `2px solid ${mine ? '#4338ca' : free ? '#22c55e' : '#ef4444'}`,
  background: free ? '#f0fdf4' : '#fef2f2',
  borderRadius: 10,
  padding: 12,
  minHeight: 120,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
});
const deskHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontWeight: 600,
};
const mineBadge: React.CSSProperties = {
  padding: '2px 6px',
  background: '#e0e7ff',
  border: '1px solid #4338ca',
  borderRadius: 999,
  fontSize: 12,
  color: '#3730a3',
};
const deskStatus = (free: boolean): React.CSSProperties => ({
  marginTop: 6,
  color: free ? '#15803d' : '#b91c1c',
  fontWeight: 500,
});
const bookBtn = (enabled: boolean): React.CSSProperties => ({
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid',
  borderColor: enabled ? '#16a34a' : '#9ca3af',
  background: enabled ? '#22c55e' : '#e5e7eb',
  color: enabled ? 'white' : '#6b7280',
  cursor: enabled ? 'pointer' : 'not-allowed',
});
const cancelBtn = (enabled: boolean): React.CSSProperties => ({
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid',
  borderColor: enabled ? '#4338ca' : '#9ca3af',
  background: enabled ? '#6366f1' : '#e5e7eb',
  color: enabled ? 'white' : '#6b7280',
  cursor: enabled ? 'pointer' : 'not-allowed',
});
const toastBox: React.CSSProperties = {
  position: 'fixed',
  bottom: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#111827',
  color: 'white',
  padding: '10px 14px',
  borderRadius: 8,
  boxShadow: '0 10px 15px rgba(0,0,0,.2)',
};
