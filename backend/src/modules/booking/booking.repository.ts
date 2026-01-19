import crypto from 'crypto';

export type BookingStatus = 'ACTIVE' | 'CANCELLED';

export interface BookingEntity {
  id: string;
  userId: string;
  deskId: number;
  date: string; // canonicalized YYYY-MM-DD (local naive date)
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  cancelledReason?: string;
  cancelledAt?: Date;
}

const bookings: BookingEntity[] = [];

function toDateKey(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 10);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

class BookingRepository {
  // constraints are enforced at service layer, repository provides basic ops
  async create(
    data: Omit<BookingEntity, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { cancelledReason?: string }
  ): Promise<BookingEntity> {
    const entity: BookingEntity = {
      id: crypto.randomUUID(),
      userId: data.userId,
      deskId: data.deskId,
      date: toDateKey(data.date),
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      cancelledReason: data.cancelledReason,
    };
    bookings.push(entity);
    return entity;
  }

  // Atomic check-and-create to mitigate race conditions in memory implementation
  async createAtomic(
    data: { userId: string; deskId: number; date: string }
  ): Promise<BookingEntity> {
    // All operations below are synchronous to avoid event loop yields
    const key = toDateKey(data.date);
    const conflictUser = bookings.find(
      (b) => b.userId === data.userId && b.date === key && b.status === 'ACTIVE'
    );
    if (conflictUser) {
      const err: any = new Error('User already has an active booking for this date');
      err.code = 'CONFLICT_USER';
      throw err;
    }
    const conflictDesk = bookings.find(
      (b) => b.deskId === data.deskId && b.date === key && b.status === 'ACTIVE'
    );
    if (conflictDesk) {
      const err: any = new Error('Desk already booked for this date');
      err.code = 'CONFLICT_DESK';
      throw err;
    }
    const entity: BookingEntity = {
      id: crypto.randomUUID(),
      userId: data.userId,
      deskId: data.deskId,
      date: key,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    bookings.push(entity);
    return entity;
  }

  async findById(id: string): Promise<BookingEntity | null> {
    return bookings.find((b) => b.id === id) || null;
  }

  async findByUserAndDate(userId: string, date: string): Promise<BookingEntity | null> {
    const key = toDateKey(date);
    return (
      bookings.find((b) => b.userId === userId && b.date === key && b.status === 'ACTIVE') || null
    );
  }

  async findByDeskAndDate(deskId: number, date: string): Promise<BookingEntity | null> {
    const key = toDateKey(date);
    return (
      bookings.find((b) => b.deskId === deskId && b.date === key && b.status === 'ACTIVE') || null
    );
  }

  async listByDate(date: string): Promise<BookingEntity[]> {
    const key = toDateKey(date);
    return bookings.filter((b) => b.date === key && b.status === 'ACTIVE');
  }

  async cancel(id: string, reason?: string): Promise<BookingEntity | null> {
    const b = bookings.find((x) => x.id === id);
    if (!b) return null;
    b.status = 'CANCELLED';
    b.updatedAt = new Date();
    b.cancelledReason = reason;
    b.cancelledAt = new Date();
    return b;
  }
}

export const bookingRepository = new BookingRepository();
export { toDateKey };
