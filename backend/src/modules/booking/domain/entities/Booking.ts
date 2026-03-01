// Domain entity for Booking with normalized state
// State values: 'PASSATA' | 'ATTIVA' | 'CANCELLATA'

export type BookingState = 'PASSATA' | 'ATTIVA' | 'CANCELLATA';

export interface Booking {
  id: string;
  userId: string;
  stationId: string;
  date: string; // YYYY-MM-DD (local date)
  timeSlot?: string | null; // optional time slot identifier (e.g., 'AM','PM','09-13')
  state: BookingState;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  // Legacy compatibility (optional/derived):
  legacyStatus?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | string;
  // Cancellation audit (optional)
  cancelledAt?: string | null; // ISO
  cancelledBy?: string | null; // userId or system
  cancelReason?: string | null;
}
