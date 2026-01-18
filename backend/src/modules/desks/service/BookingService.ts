// BookingService - business logic for creating a booking with closed-days validation

import { HolidaysService } from './HolidaysService';
import type { CreateBookingRequestDTO, BookingResponseDTO } from '../domain/dto/BookingDTO';
import type { IBookingRepository } from '../repository/BookingRepository';

function normalizeYMD(ymd: string): string {
  const [y, m, d] = (ymd || '').split('-');
  return `${String(y || '').padStart(4, '0')}-${String(m || '').padStart(2, '0')}-${String(d || '').padStart(2, '0')}`;
}

export class BookingService {
  constructor(private readonly repo: IBookingRepository, private readonly holidays: HolidaysService = new HolidaysService()) {}

  async createBooking(payload: CreateBookingRequestDTO): Promise<BookingResponseDTO> {
    const userId = (payload?.userId || '').trim();
    const deskId = (payload?.deskId || '').trim();
    const date = normalizeYMD(payload?.date || '');
    const timeSlot = payload?.timeSlot?.trim();

    const errors: string[] = [];
    if (!userId) errors.push('userId is required');
    if (!deskId) errors.push('deskId is required');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('date must be YYYY-MM-DD');

    if (errors.length > 0) {
      const err: any = new Error('Validation error');
      err.code = 'BAD_REQUEST';
      err.details = errors;
      throw err;
    }

    // Validate closed days
    if (this.holidays.isDateClosed(date)) {
      const err: any = new Error('Il coworking è chiuso in questa data');
      err.code = 'COWORKING_CLOSED';
      err.httpStatus = 422;
      throw err;
    }

    // Basic conflict/overbooking rule: prevent same desk same date (and same timeslot if provided)
    const conflicts = await this.repo.findConflicts(deskId, date, timeSlot ?? null);
    if (conflicts.length > 0) {
      const err: any = new Error('Conflitto prenotazione esistente');
      err.code = 'BOOKING_CONFLICT';
      err.httpStatus = 409;
      throw err;
    }

    const created = await this.repo.create({ userId, deskId, date, timeSlot: timeSlot ?? null, status: 'CONFIRMED' });

    const res: BookingResponseDTO = {
      id: created.id,
      userId: created.userId,
      deskId: created.deskId,
      date: created.date,
      timeSlot: created.timeSlot ?? undefined,
      status: created.status as any,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
    return res;
  }
}
