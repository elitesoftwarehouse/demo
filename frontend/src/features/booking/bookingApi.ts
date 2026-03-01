// bookingApi.ts - create and manage bookings via backend API
// Assumptions:
// - Endpoint: POST /bookings
// - Auth required (uses access token)
// - Request payload minimal: { stationId: string; date: string; timeSlot?: string }
// - Success: HTTP 201 with { id, stationId, date, status? }
// - Errors: JSON { code, message }

import { httpRequest } from '../../app/http/httpClient';

export type CreateBookingPayload = {
  stationId: string;
  date: string; // ISO YYYY-MM-DD (local date)
  timeSlot?: string | null; // optional timeslot identifier
};

export type CreateBookingResponse = {
  id: string;
  stationId: string;
  date: string;
  status?: string;
  message?: string;
};

export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResponse> {
  const res = await httpRequest<CreateBookingResponse>('/bookings', {
    method: 'POST',
    body: payload,
    auth: true,
  });
  // Some backends return 201 Created; httpRequest already throws on non-ok
  return res.data;
}
