import { Station, StationStatus } from '../domain/entities/Station';

// Simple in-memory station service with 12 fixed stations.
// In a real implementation, this might read from DB or external IoT broker.
// We keep a single call to fetch all stations for efficiency.

const STATION_COUNT = 12;

const NAMES = Array.from({ length: STATION_COUNT }, (_, i) => `Postazione ${i + 1}`);

// Basic store (simulated). In-memory with timestamps.
const store: Record<string, Station> = {};

function initOnce() {
  if (Object.keys(store).length > 0) return;
  for (let i = 0; i < STATION_COUNT; i++) {
    const id = String(i + 1);
    store[id] = {
      id,
      name: NAMES[i],
      status: (i % 3 === 0 ? 'OCCUPIED' : i % 3 === 1 ? 'FREE' : 'UNAVAILABLE') as StationStatus,
      updatedAt: new Date(),
    };
  }
}

export class StationService {
  constructor() {
    initOnce();
  }

  // Return all stations in a single call
  async getAll(): Promise<Station[]> {
    return Object.values(store).map(s => ({ ...s }));
  }

  // Optional: update station (could be used by tests)
  async setStatus(id: string, status: StationStatus) {
    if (!store[id]) throw new Error('Station not found');
    store[id] = { ...store[id], status, updatedAt: new Date() };
    return store[id];
  }
}
