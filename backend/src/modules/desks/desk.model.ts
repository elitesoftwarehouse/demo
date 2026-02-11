/**
 * Desk model for dashboard map.
 */

export type DeskStatus = 'free' | 'busy' | 'unavailable';

export interface Desk {
  id: string; // e.g., D01..D12
  name: string;
  x: number; // 0..100 percent (layout coordinates)
  y: number; // 0..100 percent (layout coordinates)
  status: DeskStatus;
}
