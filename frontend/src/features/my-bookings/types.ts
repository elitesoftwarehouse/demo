// Types for My Bookings feature

export type BookingDto = {
  id: string;
  date: string; // YYYY-MM-DD
  stationId: string;
  state: 'PASSATA' | 'ATTIVA' | 'CANCELLATA';
  timeSlot?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  // optional fields that backend may provide
  stationName?: string | null;
  building?: string | null;
  floor?: string | null;
};

export type MyBookingsQuery = {
  page?: number;
  pageSize?: number;
  state?: 'ATTIVA' | 'PASSATA' | 'CANCELLATA';
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  search?: string;
};

export type MyBookingsResponse = {
  items: BookingDto[];
  page: number;
  pageSize: number;
  total: number;
  hasNext?: boolean;
  hasPrev?: boolean;
};
