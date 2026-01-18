// Repository contract for desk bookings and a simple in-memory implementation

export interface CreateBookingInput {
  userId: string;
  deskId: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string | null;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

export interface BookingRecord {
  id: string;
  userId: string;
  deskId: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookingRepository {
  create(data: CreateBookingInput): Promise<BookingRecord>;
  findConflicts(deskId: string, date: string, timeSlot?: string | null): Promise<BookingRecord[]>;
}

export class InMemoryBookingRepository implements IBookingRepository {
  private items: BookingRecord[] = [];

  async create(data: CreateBookingInput): Promise<BookingRecord> {
    const now = new Date();
    const rec: BookingRecord = {
      id: randomId(),
      userId: data.userId,
      deskId: data.deskId,
      date: data.date,
      timeSlot: data.timeSlot ?? null,
      status: (data.status as any) || 'CONFIRMED',
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(rec);
    return rec;
  }

  async findConflicts(deskId: string, date: string, timeSlot?: string | null): Promise<BookingRecord[]> {
    return this.items.filter((b) => b.deskId === deskId && b.date === date && (!timeSlot || b.timeSlot === timeSlot) && b.status !== 'CANCELLED');
  }
}

function randomId(): string {
  const { randomBytes } = require('crypto');
  return randomBytes(16).toString('hex');
}
