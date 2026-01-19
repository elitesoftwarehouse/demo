// In-memory Desk repository for MVP 2x3 map (6 desks)
// In a real project, replace with Prisma/PostgreSQL implementation

export interface DeskRecord {
  id: number; // numeric id (1..6)
  code: string; // label/codice es. D1
  row: number; // 0-based row in 2x3 grid
  col: number; // 0-based col in 2x3 grid
  active: boolean;
}

const desks: DeskRecord[] = [
  { id: 1, code: 'D1', row: 0, col: 0, active: true },
  { id: 2, code: 'D2', row: 0, col: 1, active: true },
  { id: 3, code: 'D3', row: 0, col: 2, active: true },
  { id: 4, code: 'D4', row: 1, col: 0, active: true },
  { id: 5, code: 'D5', row: 1, col: 1, active: true },
  { id: 6, code: 'D6', row: 1, col: 2, active: true },
];

class DeskRepository {
  async getAll(): Promise<DeskRecord[]> {
    return desks.slice();
  }

  async listActive(): Promise<DeskRecord[]> {
    return desks.filter((d) => d.active);
  }

  async findById(id: number): Promise<DeskRecord | null> {
    return desks.find((d) => d.id === id) || null;
  }

  // For admin/testing: toggle active state
  async setActive(id: number, active: boolean): Promise<DeskRecord | null> {
    const d = desks.find((x) => x.id === id);
    if (!d) return null;
    d.active = active;
    return d;
  }
}

export const deskRepository = new DeskRepository();
