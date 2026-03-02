// In-memory repository for coworking desks (2x3 map)
// Follow same minimal pattern used in user repository

export interface DeskEntity {
  id: number; // stable numeric id
  code: string; // e.g., D1..D6
  label: string; // human-readable label
  row: number; // 1..2
  col: number; // 1..3
  active: boolean;
}

const desks: DeskEntity[] = [];

// seed 2x3 desks if empty
(function seed() {
  if (desks.length > 0) return;
  let id = 1;
  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 3; c++) {
      desks.push({
        id,
        code: `D${id}`,
        label: `Desk ${id}`,
        row: r,
        col: c,
        active: true,
      });
      id++;
    }
  }
})();

class DeskRepository {
  async listAll(): Promise<DeskEntity[]> {
    return desks.slice();
  }

  async listActive(): Promise<DeskEntity[]> {
    return desks.filter((d) => d.active);
  }

  async findById(id: number): Promise<DeskEntity | null> {
    const d = desks.find((x) => x.id === id) || null;
    return d;
  }

  // admin utility for future use
  async setActive(id: number, active: boolean): Promise<DeskEntity | null> {
    const d = desks.find((x) => x.id === id);
    if (!d) return null;
    d.active = active;
    return d;
  }
}

export const deskRepository = new DeskRepository();
