// Minimal booking client used by BookingConfirmationDialog

export type CreateDeskBookingRequest = {
  deskId: string;
  date: string; // YYYY-MM-DD
};

export type CreateDeskBookingResponse = {
  bookingId: string;
};

export type BookingClientOptions = { baseUrl?: string };

export async function createBooking(
  payload: CreateDeskBookingRequest,
  opts?: BookingClientOptions & { signal?: AbortSignal },
): Promise<CreateDeskBookingResponse> {
  const baseUrl = opts?.baseUrl || '/api';
  const res = await fetch(`${baseUrl}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: opts?.signal,
  });
  if (!res.ok) {
    let message = 'booking.create_failed';
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {}
    throw new Error(message);
  }
  const data = (await res.json()) as CreateDeskBookingResponse;
  return data;
}
