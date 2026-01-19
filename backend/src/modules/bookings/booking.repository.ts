// In-memory Booking repository for MVP
// Real implementation should use Prisma/PostgreSQL enforcing uniques

export type BookingStatus = 'ACTIVE' | 'CANCELLED';

export interface BookingRecord {
  id: string;
  userId: string;
  deskId: number;
  date: string; // canonical YYYY-MM-DD
  status: BookingStatus;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  cancelReason?: string;
}

const bookings: BookingRecord[] = [];

function genId() {
  return 'bk_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

class BookingRepository {
  async listByDate(date: string): Promise<BookingRecord[]> {
    return bookings.filter((b) => b.date === date && b.status === 'ACTIVE');
  }

  async findUserBookingOnDate(userId: string, date: string): Promise<BookingRecord | null> {
    return (
      bookings.find((b) => b.userId === userId && b.date === date && b.status === 'ACTIVE') || null
    );
  }

  async findDeskBookingOnDate(deskId: number, date: string): Promise<BookingRecord | null> {
    return (
      bookings.find((b) => b.deskId === deskId && b.date === date && b.status === 'ACTIVE') || null
    );
  }

  async findById(id: string): Promise<BookingRecord | null> {
    return bookings.find((b) => b.id === id) || null;
  }

  async create(data: { userId: string; deskId: number; date: string }): Promise<BookingRecord> {
    const now = Date.now();
    const rec: BookingRecord = {
      id: genId(),
      userId: data.userId,
      deskId: data.deskId,
      date: data.date,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    bookings.push(rec);
    return rec;
  }

  async cancel(id: string, reason?: string): Promise<BookingRecord | null> {
    const b = bookings.find((x) => x.id === id);
    if (!b) return null;
    b.status = 'CANCELLED';
    b.cancelReason = reason;
    b.updatedAt = Date.now();
    return b;
  }
}

export const bookingRepository = new BookingRepository();
