// DTOs for desk booking creation and responses
// IMPORTANT: Do not include sensitive information in logs

export interface CreateBookingRequestDTO {
  userId: string; // idUtente
  deskId: string; // idPostazione
  date: string; // dataPrenotazione in format YYYY-MM-DD (local)
  timeSlot?: string; // optional: e.g., MORNING, AFTERNOON, FULL_DAY, or HH:MM-HH:MM
  notes?: string;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface BookingResponseDTO {
  id: string;
  userId: string;
  deskId: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string;
  status: BookingStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface BookingError {
  code: string;
  message: string;
  details?: any;
}
