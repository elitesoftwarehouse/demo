export type StationStatus = 'available' | 'busy' | 'unavailable';

export type Station = {
  id: string; // e.g., 'S01'
  name?: string;
  status: StationStatus;
  updatedAt?: string; // ISO
};

export const STATION_IDS = Array.from({ length: 12 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`);
