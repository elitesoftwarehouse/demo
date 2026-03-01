// statusMapper.ts - helper to normalize backend booking state values to UI states
// Maps various backend/legacy values to normalized: 'ATTIVA' | 'PASSATA' | 'CANCELLATA'

export type BookingUiState = 'ATTIVA' | 'PASSATA' | 'CANCELLATA';

export function normalizeBookingState(input: string | null | undefined): BookingUiState | null {
  if (!input) return null;
  const v = String(input).trim().toUpperCase();

  // Already normalized
  if (v === 'ATTIVA' || v === 'PASSATA' || v === 'CANCELLATA') return v as BookingUiState;

  // English/common forms
  if (v === 'ACTIVE' || v === 'CONFIRMED' || v === 'PENDING' || v === 'OPEN' || v === 'BOOKED') return 'ATTIVA';
  if (v === 'PAST' || v === 'COMPLETED' || v === 'DONE') return 'PASSATA';
  if (v === 'CANCELLED' || v === 'CANCELED' || v === 'CANCELLED_BY_USER' || v === 'CANCELLED_BY_ADMIN') return 'CANCELLATA';

  return null;
}
