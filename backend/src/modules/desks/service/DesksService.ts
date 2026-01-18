import type { IDesksRepository } from '../repository/DesksRepository';
import type { Desk, DeskStatus } from '../domain/Desk';

export interface DesksResponseDTO {
  total: number; // number of desks returned
  expected: number; // expected total (12)
  missing: number; // expected - total (>=0)
  items: Desk[];
  statusCount: Record<DeskStatus, number>;
}

export class DesksService {
  constructor(private readonly repo: IDesksRepository, private readonly expectedTotal: number = 12) {}

  async getDesks(): Promise<DesksResponseDTO> {
    const items = await this.repo.listDesks();
    const total = items.length;
    const expected = this.expectedTotal;
    const missing = expected > total ? expected - total : 0;

    const statusCount: Record<DeskStatus, number> = {
      FREE: 0,
      OCCUPIED: 0,
      UNAVAILABLE: 0,
    };
    for (const d of items) {
      if (statusCount[d.status] !== undefined) statusCount[d.status] += 1;
    }

    return { total, expected, missing, items, statusCount };
  }
}
