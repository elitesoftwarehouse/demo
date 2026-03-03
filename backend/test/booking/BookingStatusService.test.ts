import { BookingStatusService } from '../../src/modules/booking/domain/services/BookingStatusService';
import type { BookingState } from '../../src/modules/booking/domain/entities/Booking';

function toUtc(y: number, m: number, d: number, hh = 0, mm = 0, ss = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
}

describe('BookingStatusService.computeStatus', () => {
  it('maps cancelled with source USER to CANCELLATA_DA_UTENTE', () => {
    const now = toUtc(2026, 4, 1, 12, 0, 0);
    const status = BookingStatusService.computeStatus({ date: '2026-04-20', cancelledAt: now.toISOString(), cancellationSource: 'USER', now });
    expect(status as BookingState).toBe('CANCELLATA_DA_UTENTE');
  });

  it('maps cancelled with source ADMIN to CANCELLATA_DA_ADMIN', () => {
    const now = toUtc(2026, 4, 1, 12, 0, 0);
    const status = BookingStatusService.computeStatus({ date: '2026-04-20', cancelledAt: now.toISOString(), cancellationSource: 'ADMIN', now });
    expect(status as BookingState).toBe('CANCELLATA_DA_ADMIN');
  });

  it('maps cancelled without source to CANCELLATA', () => {
    const now = toUtc(2026, 4, 1, 12, 0, 0);
    const status = BookingStatusService.computeStatus({ date: '2026-04-20', cancelledAt: now.toISOString(), now });
    expect(status as BookingState).toBe('CANCELLATA');
  });

  it('returns PASSATA for date before today in Europe/Rome', () => {
    const now = toUtc(2026, 5, 10, 10, 0, 0);
    // Today in Europe/Rome ~ 2026-05-10
    const status = BookingStatusService.computeStatus({ date: '2026-05-09', now, tz: 'Europe/Rome' });
    expect(status as BookingState).toBe('PASSATA');
  });

  it('returns ATTIVA for today or future when not cancelled', () => {
    const now = toUtc(2026, 5, 10, 10, 0, 0);
    expect(BookingStatusService.computeStatus({ date: '2026-05-10', now })).toBe('ATTIVA');
    expect(BookingStatusService.computeStatus({ date: '2026-05-11', now })).toBe('ATTIVA');
  });
});
