import { postJson } from './api';

export interface CreateBookingPayload {
  deskId: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string;
}

export interface BookingResponse {
  id: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
}

export async function createBooking(baseUrl: string, payload: CreateBookingPayload): Promise<BookingResponse> {
  return postJson(`${baseUrl}/api/bookings`, payload);
}
