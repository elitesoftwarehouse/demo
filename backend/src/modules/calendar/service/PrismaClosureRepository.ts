// PrismaClosureRepository - Prisma-based adapter for IClosureRepository
// Requires @prisma/client and a PrismaClient instance

import type { IClosureRepository, CoworkingClosure } from './ClosureService';

let prisma: any;
function getPrisma() {
  if (!prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
    } catch (e) {
      throw new Error('Prisma client not available. Install @prisma/client and run prisma generate');
    }
  }
  return prisma;
}

export class PrismaClosureRepository implements IClosureRepository {
  async findActiveClosures(_at?: Date): Promise<CoworkingClosure[]> {
    const db = getPrisma();
    const items = await db.coworkingClosure.findMany({ where: { active: true } });
    // Map fields if necessary
    return items.map((i: any) => ({
      id: i.id,
      type: i.type,
      date: i.date,
      weekday: i.weekday,
      month: i.month,
      monthDay: i.monthDay ?? i.month_day,
      reason: i.reason,
      active: i.active,
      startDate: i.startDate ?? i.start_date,
      endDate: i.endDate ?? i.end_date,
    }));
  }
}
