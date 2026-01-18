// DeskService - orchestrates retrieval of desk statuses
// Provides a thin layer for future expansion (e.g., caching, mapping)

import type { IDeskRepository } from '../repository/DeskRepository';
import type { DeskStatusDTO } from '../domain/DeskDTO';

export class DeskService {
  constructor(private readonly repo: IDeskRepository) {}

  // Returns the list of 12 desk statuses
  async getAllStatuses(): Promise<DeskStatusDTO[]> {
    // A simple pass-through; could add caching if needed.
    // For near-real-time dashboard with client polling, keep it fresh.
    return this.repo.listAll();
  }
}
