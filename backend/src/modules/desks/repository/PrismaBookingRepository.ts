// Prisma-based booking repository implementation (optional)
// Assumes a Prisma model Booking is defined; if not, this file serves as a placeholder.

import type { BookingRecord, CreateBookingInput, IBookingRepository } from './BookingRepository';

let prisma: any;
function getPrisma() {
  if (!prisma) {
    try {
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
    } catch {
      throw new Error('Prisma client not available - install @prisma/client and run prisma generate');
    }
  }
  return prisma;
}

function map(rec: any): BookingRecord {
  return {
    id: rec.id,
    userId: rec.userId ?? rec.user_id,
    deskId: rec.deskId ?? rec.desk_id,
    date: typeof rec.date === 'string' ? rec.date : rec.date.toISOString().slice(0, 10),
    timeSlot: rec.timeSlot ?? rec.time_slot ?? null,
    status: rec.status,
    createdAt: new Date(rec.createdAt ?? rec.created_at),
    updatedAt: new Date(rec.updatedAt ?? rec.updated_at),
  };
}

export class PrismaBookingRepository implements IBookingRepository {
  async create(data: CreateBookingInput): Promise<BookingRecord> {
    const db = getPrisma();
    const rec = await db.booking.create({
      data: {
        userId: data.userId,
        deskId: data.deskId,
        date: data.date,
        timeSlot: data.timeSlot,
        status: data.status ?? 'CONFIRMED',
      },
    });
    return map(rec);
  }

  async findConflicts(deskId: string, date: string, timeSlot?: string | null): Promise<BookingRecord[]> {
    const db = getPrisma();
    const where: any = { deskId, date, status: { not: 'CANCELLED' } };
    if (timeSlot) where.timeSlot = timeSlot;
    const rows = await db.booking.findMany({ where });
    return rows.map(map);
  }
}
