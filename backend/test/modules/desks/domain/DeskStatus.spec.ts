import { DESK_STATUS, DeskStatusLabel } from '../../../../src/modules/desks/domain/Desk';

describe('Desk status mapping', () => {
  it('contains all expected statuses', () => {
    expect(DESK_STATUS.sort()).toEqual(['FREE', 'OCCUPIED', 'UNAVAILABLE'].sort());
  });

  it('labels map correctly', () => {
    expect(DeskStatusLabel.FREE).toBe('Libero');
    expect(DeskStatusLabel.OCCUPIED).toBe('Occupato');
    expect(DeskStatusLabel.UNAVAILABLE).toBe('Non disponibile');
  });
});
