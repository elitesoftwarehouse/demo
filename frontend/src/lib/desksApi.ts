// Minimal placeholder API to fetch desks list
// Existing components already import from '../lib/desksApi' so keep the same shape

export type DeskStatus = 'FREE' | 'OCCUPIED' | 'UNAVAILABLE';
export interface Desk {
  id: string;
  name: string;
  status: DeskStatus;
  floor?: number | string;
  building?: string;
}

export async function fetchDesks(baseUrl = ''): Promise<{ items: Desk[] }> {
  // Mock implementation; in real app this would fetch(`${baseUrl}/api/desks`)
  // Provide a stable list for UI usage
  return {
    items: [
      { id: '1', name: 'A-01', status: 'FREE', floor: 1, building: 'A' },
      { id: '2', name: 'A-02', status: 'OCCUPIED', floor: 1, building: 'A' },
      { id: '3', name: 'A-03', status: 'FREE', floor: 1, building: 'A' },
      { id: '4', name: 'B-01', status: 'UNAVAILABLE', floor: 2, building: 'B' },
    ],
  };
}
