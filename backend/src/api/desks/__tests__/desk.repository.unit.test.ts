import { DEFAULT_LAYOUT, getCurrentDesks, mapApiStatus, mergeStatuses, type DeskStatusSourceItem } from '../../../modules/desks/desk.repository';

// declare jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

describe('desk.repository - unit tests', () => {
  test('mapApiStatus mapping variants', () => {
    expect(mapApiStatus('free')).toBe('free');
    expect(mapApiStatus('available')).toBe('free');
    expect(mapApiStatus('libero')).toBe('free');
    expect(mapApiStatus('busy')).toBe('busy');
    expect(mapApiStatus('occupied')).toBe('busy');
    expect(mapApiStatus('reservED')).toBe('busy');
    expect(mapApiStatus('unknown')).toBe('unavailable');
    expect(mapApiStatus('')).toBe('unavailable');
  });

  test('mergeStatuses merges status/name/pos where provided', () => {
    const layout = [ { ...DEFAULT_LAYOUT[0] }, { ...DEFAULT_LAYOUT[1] } ];
    const updates: DeskStatusSourceItem[] = [
      { id: layout[0].id, status: 'occupied', name: 'Custom 1', x: 11, y: 16 },
    ];
    const out = mergeStatuses(layout, updates);
    expect(out[0].status).toBe('busy');
    expect(out[0].name).toBe('Custom 1');
    expect(out[0].x).toBe(11);
    expect(out[0].y).toBe(16);
    // untouched second
    expect(out[1]).toEqual(layout[1]);
  });

  test('getCurrentDesks with 0 updates returns base layout (12)', async () => {
    const desks = await getCurrentDesks(async () => []);
    expect(desks.length).toBe(12);
  });

  test('getCurrentDesks handles less than 12 updates', async () => {
    const updates: DeskStatusSourceItem[] = [ { id: 'D01', status: 'occupied' }, { id: 'D03', status: 'free' } ];
    const desks = await getCurrentDesks(async () => updates);
    const m = new Map(desks.map((d) => [d.id, d] as const));
    expect(m.get('D01')!.status).toBe('busy');
    expect(m.get('D03')!.status).toBe('free');
    expect(desks.length).toBe(12);
  });
});
