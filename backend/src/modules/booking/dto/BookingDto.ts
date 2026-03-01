// Public DTO for Booking safe to return via API
// Uses normalized state values and omits internal fields

export type BookingDto = {
  id: string;
  date: string; // YYYY-MM-DD
  stationId: string;
  state: 'PASSATA' | 'ATTIVA' | 'CANCELLATA';
  timeSlot?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};
