import { bookingRepository } from './booking.repository';
import { deskRepository } from '../desks/desk.repository';
import { isBusinessDay, isValidDateOnly, startOfDateMs, toDateOnlyString } from '../../utils/date';
import { withLock } from '../../utils/lock';

export interface CreateBookingDto {
  deskId: number;
  date: string; // YYYY-MM-DD
}

export class BusinessError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

class BookingsService {
  async getMap(date: string, currentUserId?: string) {
    if (!isValidDateOnly(date)) throw new BusinessError('DATE_INVALID', 'Invalid date format');

    const desks = await deskRepository.getAll();
    const bookings = await bookingRepository.listByDate(date);
    const occupiedByDesk = new Map<number, { userId: string }>();
    for (const b of bookings) occupiedByDesk.set(b.deskId, { userId: b.userId });

    return desks.map((d) => {
      const occ = occupiedByDesk.get(d.id);
      const isMe = occ && occ.userId === currentUserId;
      return {
        desk: { id: d.id, code: d.code, row: d.row, col: d.col, active: d.active },
        status: occ ? 'OCCUPIED' : 'FREE',
        occupant: occ
          ? {
              isMe: Boolean(isMe),
              userId: isMe ? occ.userId : undefined,
            }
          : undefined,
      };
    });
  }

  async create(userId: string, dto: CreateBookingDto) {
    const dateOnly = toDateOnlyString(dto.date);
    if (!isValidDateOnly(dateOnly)) throw new BusinessError('DATE_INVALID', 'Invalid date');
    if (!isBusinessDay(dateOnly))
      throw new BusinessError('NON_WORKING_DAY', 'Bookings allowed on working days only');

    const desk = await deskRepository.findById(dto.deskId);
    if (!desk) throw new BusinessError('DESK_NOT_FOUND', 'Desk not found');
    if (!desk.active) throw new BusinessError('DESK_INACTIVE', 'Desk is inactive');

    // Concurrency control: serialize creations on the same date to avoid race conditions
    const lockKey = `booking:create:${dateOnly}`;
    return withLock(lockKey, async () => {
      const existingUser = await bookingRepository.findUserBookingOnDate(userId, dateOnly);
      if (existingUser)
        throw new BusinessError('USER_ALREADY_BOOKED', 'User already has a booking for this day');

      const existingDesk = await bookingRepository.findDeskBookingOnDate(dto.deskId, dateOnly);
      if (existingDesk)
        throw new BusinessError('DESK_ALREADY_BOOKED', 'Desk already booked for this day');

      const created = await bookingRepository.create({ userId, deskId: dto.deskId, date: dateOnly });
      return created;
    });
  }

  async cancel(userId: string, bookingId: string, reason?: string) {
    const b = await bookingRepository.findById(bookingId);
    if (!b || b.status !== 'ACTIVE') throw new BusinessError('NOT_FOUND', 'Booking not found');
    if (b.userId !== userId) throw new BusinessError('FORBIDDEN', 'Not your booking');

    const dateStart = startOfDateMs(b.date);
    const now = Date.now();
    const diff = dateStart - now;
    const HOURS_24 = 24 * 60 * 60 * 1000;
    if (diff <= HOURS_24)
      throw new BusinessError(
        'CANCELLATION_WINDOW_PASSED',
        'Cannot cancel within 24 hours from booking day start'
      );

    const cancelled = await bookingRepository.cancel(b.id, reason);
    return cancelled!;
  }
}

export const bookingsService = new BookingsService();
