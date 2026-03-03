// Domain entity for Booking and booking state management
// Note: date is date-only semantics (Europe/Rome). Avoid logging sensitive PII.

export type BookingState = 'PASSATA' | 'ATTIVA' | 'CANCELLATA' | 'CANCELLATA_DA_UTENTE' | 'CANCELLATA_DA_ADMIN';

export type CancellationSource = 'USER' | 'ADMIN' | 'SYSTEM';

export interface Booking {
  id: string;
  userId: string;
  deskId: string;
  date: string; // YYYY-MM-DD
  // Start/end instants (UTC ISO) optional; if absent, UI/logic fall back to 09:00 local
  startAt?: string | null;
  endAt?: string | null;
  status: BookingState;
  cancelledAt?: string | null; // ISO string
  // Audit fields for cancellation
  cancelledByUserId?: string | null;
  cancellationSource?: CancellationSource | null;
  cancellationReason?: string | null;

  createdAt: string;
  updatedAt: string;
}
