// Helper/mapper to translate backend booking state/status values to UI-friendly types

export type UiBookingState = 'passed' | 'active' | 'cancelled' | 'unknown';

function normalizeString(input: string): string {
  return (input || '').trim().toUpperCase();
}

// Accept several possible backend values and map to a small set of UI states
export function normalizeBookingState(input?: string | null): UiBookingState {
  const s = normalizeString(String(input ?? ''));
  switch (s) {
    case 'ATTIVA':
    case 'ACTIVE':
    case 'ATTIVO':
      return 'active';
    case 'PASSATA':
    case 'PAST':
    case 'EXPIRED':
      return 'passed';
    case 'CANCELLATA':
    case 'CANCELLED':
    case 'CANCELED':
    case 'CANC':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

export function bookingStateLabelKey(state: UiBookingState): string {
  switch (state) {
    case 'active':
      return 'bookings.status.active';
    case 'passed':
      return 'bookings.status.passed';
    case 'cancelled':
      return 'bookings.status.cancelled';
    default:
      return 'bookings.status.unknown';
  }
}

// Colors chosen for sufficient contrast (WCAG AA against white text)
export function bookingStateColors(state: UiBookingState): { bg: string; fg: string; border?: string } {
  switch (state) {
    case 'active':
      return { bg: '#16a34a', fg: '#ffffff' }; // green-600
    case 'passed':
      return { bg: '#6b7280', fg: '#ffffff' }; // gray-500/600
    case 'cancelled':
      return { bg: '#dc2626', fg: '#ffffff' }; // red-600
    default:
      return { bg: '#374151', fg: '#ffffff' }; // gray-700 for unknown
  }
}
