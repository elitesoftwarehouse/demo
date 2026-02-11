/**
 * Calendar controller: exposes disabled dates within a date range for the date picker.
 * Endpoint (framework-agnostic): GET /api/calendar/disabled-dates?from=YYYY-MM-DD&to=YYYY-MM-DD
 */

import type { ResponseLike, RequestLike } from '../auth/auth.controller';
import { computeDisabledDates, parseIsoDate, diffDaysInclusive } from '../../modules/calendar/holiday.service';

function getQuery(req: any, key: string): string | undefined {
  // Support common locations for query params depending on framework adapters
  if (req && req.query && typeof req.query[key] === 'string') return req.query[key];
  if (req && req.params && typeof req.params[key] === 'string') return req.params[key];
  if (req && req.body && typeof req.body[key] === 'string') return req.body[key];
  // Avoid using URL global (types not available in this demo); rely on provided adapters
  return undefined;
}

export async function getDisabledDatesHandler(req: RequestLike & { query?: any; params?: any; url?: string }, res: ResponseLike): Promise<void> {
  try {
    const fromStr = getQuery(req as any, 'from');
    const toStr = getQuery(req as any, 'to');

    if (!fromStr || !toStr) {
      res.status(400).json({ error: 'invalid_input', details: { from: 'required', to: 'required' } });
      return;
    }

    const from = parseIsoDate(fromStr);
    const to = parseIsoDate(toStr);

    if (!from || !to) {
      res.status(400).json({ error: 'invalid_input', details: { from: 'invalid_format', to: 'invalid_format' } });
      return;
    }

    if (from.getTime() > to.getTime()) {
      res.status(400).json({ error: 'invalid_input', details: { range: 'from_after_to' } });
      return;
    }

    // Limit range to avoid abuse: up to 370 days inclusive
    const MAX_DAYS = 370;
    const span = diffDaysInclusive(from, to);
    if (span > MAX_DAYS) {
      res.status(400).json({ error: 'invalid_input', details: { range: 'too_large', maxDays: MAX_DAYS } });
      return;
    }

    const disabledDates = computeDisabledDates(from, to);
    res.status(200).json({ disabledDates });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
}
