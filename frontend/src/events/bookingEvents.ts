// Lightweight event bus for booking-related UI updates
// Consumers (e.g., after a successful API booking) should call dispatchBookingCreated
// The desks data hook will listen and update local state immediately.

export type BookingCreatedDetail = {
  deskId: string;
  // YYYY-MM-DD date for which the desk has been booked
  date: string;
};

export const BOOKING_CREATED_EVENT = 'desk-booking:created';

export function dispatchBookingCreated(detail: BookingCreatedDetail): void {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent<BookingCreatedDetail>(BOOKING_CREATED_EVENT, { detail });
  window.dispatchEvent(event);
}

export type BookingCreatedHandler = (detail: BookingCreatedDetail) => void;

export function addBookingCreatedListener(handler: BookingCreatedHandler): () => void {
  const listener = (e: Event) => {
    const ce = e as CustomEvent<BookingCreatedDetail>;
    if (ce?.detail) handler(ce.detail);
  };
  window.addEventListener(BOOKING_CREATED_EVENT, listener);
  return () => window.removeEventListener(BOOKING_CREATED_EVENT, listener);
}
