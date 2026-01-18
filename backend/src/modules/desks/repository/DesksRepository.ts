import type { Desk } from '../domain/Desk';

export interface IDesksRepository {
  // Returns current known desks and statuses. May return 0..12 items.
  listDesks(): Promise<Desk[]>;
}

// In-memory implementation for tests and local dev
export class InMemoryDesksRepository implements IDesksRepository {
  private items: Desk[] = [];

  constructor(items?: Desk[]) {
    if (items) this.items = items.slice();
  }

  setItems(items: Desk[]) {
    this.items = items.slice();
  }

  async listDesks(): Promise<Desk[]> {
    return this.items.slice();
  }
}
