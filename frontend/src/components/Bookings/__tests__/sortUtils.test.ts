import { sortBookings } from '../sortUtils';
import type { UserBookingItemDto } from '../../../api/bookingsClient';

function B(id: string, start: string, end?: string | null): UserBookingItemDto {
  return {
    id,
    startDate: start,
    endDate: end ?? null,
    deskId: `D-${id}`,
    status: 'confirmed',
  } as UserBookingItemDto;
}

describe('sortUtils', () => {
  it('sorts by startDate ascending, then endDate, then deskId/id', () => {
    const items = [B('3', '2026-02-01'), B('1', '2026-01-16'), B('2', '2026-01-20')];
    const sorted = sortBookings(items);
    expect(sorted.map((i) => i.id)).toEqual(['1', '2', '3']);
  });

  it('null endDate sorted after concrete endDate if same start', () => {
    const a = B('a', '2026-01-16', '2026-01-16T10:00:00Z');
    const b = B('b', '2026-01-16', null);
    const c = B('c', '2026-01-16', '2026-01-16T12:00:00Z');
    const sorted = sortBookings([b, c, a]);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });

  it('stable ordering using deskId/id if same timestamps', () => {
    const a = B('1', '2026-01-16T09:00:00Z');
    const b = B('2', '2026-01-16T09:00:00Z');
    const sorted = sortBookings([b, a]);
    expect(sorted.map((i) => i.id)).toEqual(['1', '2']);
  });
});
