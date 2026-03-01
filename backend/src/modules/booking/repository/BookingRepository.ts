// Repository interface for Booking persistence
// Keeps persistence details hidden from services/handlers.

import type { Booking } from '../domain/entities/Booking';

export interface CreateBookingData {
  userId: string;
  stationId: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string | null;
  // state is managed by DB default/logic as 'ATTIVA' for new future bookings
}

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  create(data: CreateBookingData): Promise<Booking>;
  // Optional helpers for listing and state transitions can be added later
}
