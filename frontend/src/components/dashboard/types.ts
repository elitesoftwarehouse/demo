export type DeskStatus = 'free' | 'occupied' | 'unavailable';

export interface Desk {
  id: string; // unique id, e.g., D1..D12
  label: string; // human-readable label e.g., "Postazione 1"
  status: DeskStatus;
}
