// InMemoryClosureRepository - simple implementation for tests/dev
import type { IClosureRepository, CoworkingClosure } from './ClosureService';

export class InMemoryClosureRepository implements IClosureRepository {
  private items: CoworkingClosure[] = [];

  constructor(seed?: CoworkingClosure[]) {
    if (seed && Array.isArray(seed)) this.items = seed.slice();
  }

  add(c: CoworkingClosure) {
    this.items.push(c);
  }

  async findActiveClosures(_at?: Date): Promise<CoworkingClosure[]> {
    return this.items.filter((i) => i.active !== false);
  }
}
