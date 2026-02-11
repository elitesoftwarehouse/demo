/**
 * Repository/service placeholder for reading current desk statuses.
 * In real implementation this would query a DB table or an external service.
 */

import type { Desk, DeskStatus } from './desk.model';

export const DEFAULT_LAYOUT: Desk[] = [
  { id: 'D01', name: 'Postazione D01', x: 10, y: 15, status: 'free' },
  { id: 'D02', name: 'Postazione D02', x: 40, y: 15, status: 'busy' },
  { id: 'D03', name: 'Postazione D03', x: 70, y: 15, status: 'unavailable' },
  { id: 'D04', name: 'Postazione D04', x: 10, y: 40, status: 'free' },
  { id: 'D05', name: 'Postazione D05', x: 40, y: 40, status: 'busy' },
  { id: 'D06', name: 'Postazione D06', x: 70, y: 40, status: 'unavailable' },
  { id: 'D07', name: 'Postazione D07', x: 10, y: 65, status: 'free' },
  { id: 'D08', name: 'Postazione D08', x: 40, y: 65, status: 'busy' },
  { id: 'D09', name: 'Postazione D09', x: 70, y: 65, status: 'unavailable' },
  { id: 'D10', name: 'Postazione D10', x: 10, y: 85, status: 'free' },
  { id: 'D11', name: 'Postazione D11', x: 40, y: 85, status: 'busy' },
  { id: 'D12', name: 'Postazione D12', x: 70, y: 85, status: 'unavailable' },
];

export type DeskStatusSourceItem = {
  id: string;
  status: string; // may be in various languages/aliases
  name?: string;
  x?: number;
  y?: number;
};

export function mapApiStatus(input: any): DeskStatus {
  const v = String(input || '').toLowerCase();
  switch (v) {
    case 'free':
    case 'available':
    case 'libero':
      return 'free';
    case 'busy':
    case 'occupied':
    case 'occupato':
    case 'reserved':
      return 'busy';
    default:
      return 'unavailable';
  }
}

export function mergeStatuses(layout: Desk[], updates: DeskStatusSourceItem[]): Desk[] {
  const m = new Map(updates.map((u) => [u.id, u] as const));
  return layout.map((d) => {
    const u = m.get(d.id);
    if (!u) return d;
    const status = mapApiStatus(u.status);
    const name = u.name || d.name;
    const x = typeof u.x === 'number' ? u.x : d.x;
    const y = typeof u.y === 'number' ? u.y : d.y;
    return { ...d, status, name, x, y };
  });
}

// In-memory source simulation; callers can inject a different fetcher in tests
export type FetchStatusesFn = () => Promise<DeskStatusSourceItem[]>;

export async function getCurrentDesks(
  fetcher?: FetchStatusesFn,
  layout?: Desk[],
): Promise<Desk[]> {
  const base = layout && layout.length ? layout : DEFAULT_LAYOUT;
  const src = fetcher ? await fetcher() : [];
  // if no updates returned, keep default/base
  return src && src.length ? mergeStatuses(base, src) : base;
}
