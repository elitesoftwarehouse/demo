// Repository contract for accessing Desk (Postazione) statuses
// This initial implementation uses an in-memory store with 12 desks.
// Can be replaced with DB or external service without changing consumers.

import type { DeskStatusDTO, DeskState } from '../domain/DeskDTO';

export interface IDeskRepository {
  // Return all 12 desk statuses in a single call
  listAll(): Promise<DeskStatusDTO[]>;
  // Optional: update a desk status (for tests/demo only)
  setStatus(id: string, status: DeskState, updatedAt?: Date, meta?: Record<string, any>): Promise<void>;
}

export class InMemoryDeskRepository implements IDeskRepository {
  private items: Map<string, DeskStatusDTO> = new Map();

  constructor() {
    const now = new Date().toISOString();
    for (let i = 1; i <= 12; i++) {
      const id = `desk-${i}`;
      this.items.set(id, {
        id,
        label: `Postazione ${i}`,
        status: 'LIBERA',
        updatedAt: now,
      });
    }
  }

  async listAll(): Promise<DeskStatusDTO[]> {
    // Return a snapshot sorted by numeric suffix to keep stable order
    return Array.from(this.items.values()).sort((a, b) => num(a.id) - num(b.id));
  }

  async setStatus(id: string, status: DeskState, updatedAt?: Date, meta?: Record<string, any>): Promise<void> {
    const cur = this.items.get(id);
    const now = (updatedAt ?? new Date()).toISOString();
    if (!cur) {
      this.items.set(id, { id, label: humanize(id), status, updatedAt: now, meta });
      return;
    }
    this.items.set(id, { ...cur, status, updatedAt: now, meta: meta ?? cur.meta });
  }
}

function num(id: string): number {
  const m = id.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function humanize(id: string): string {
  const n = num(id);
  return Number.isFinite(n) && n > 0 ? `Postazione ${n}` : id;
}
