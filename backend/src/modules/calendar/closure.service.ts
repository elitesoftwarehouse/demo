/**
 * Business service for coworking closure logic.
 * Exposes isGiornoChiuso(date) and integrates computed holidays/weekends with DB-configured closures.
 */

import { computeDisabledDates } from './holiday.service';
import { isClosedDate } from './closure.repository';

function normalizeDateUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Returns true if the given UTC date should be considered closed for bookings.
 * Logic:
 * - First checks DB-configured closures (single or recurring)
 * - Then considers Sundays and public holidays (as per computeDisabledDates)
 */
export async function isGiornoChiuso(date: Date): Promise<boolean> {
  const d = normalizeDateUTC(date);

  // 1) Custom closures from DB
  if (await isClosedDate(d)) return true;

  // 2) Computed holidays/weekends via calendar service
  const disabled = computeDisabledDates(d, d);
  return disabled.length > 0;
}
