// CalendarController - exposes API to fetch disabled dates in a given range
// Endpoint: GET /api/calendar/disabled-dates?from=YYYY-MM-DD&to=YYYY-MM-DD
// Validates params and returns { disabledDates: string[] }

import type { Request, Response } from 'express';
import { ItalianHolidayService } from '../service/ItalianHolidayService';

export class CalendarController {
  constructor(private readonly holidaySvc: ItalianHolidayService = new ItalianHolidayService()) {}

  // GET /api/calendar/disabled-dates
  disabledDates = async (req: Request, res: Response) => {
    try {
      const fromStr = String((req.query.from ?? '') as string).trim();
      const toStr = String((req.query.to ?? '') as string).trim();

      // Basic validations
      const errors: string[] = [];
      if (!fromStr) errors.push('from is required');
      if (!toStr) errors.push('to is required');
      if (fromStr && !isIsoDate(fromStr)) errors.push('from must be YYYY-MM-DD');
      if (toStr && !isIsoDate(toStr)) errors.push('to must be YYYY-MM-DD');
      if (errors.length > 0) return res.status(400).json({ success: false, error: { message: 'Invalid input', details: errors } });

      const from = parseIsoDate(fromStr);
      const to = parseIsoDate(toStr);
      if (!from || !to) return res.status(400).json({ success: false, error: { message: 'Invalid date values' } });
      if (to.getTime() < from.getTime()) {
        return res.status(400).json({ success: false, error: { message: 'from must be <= to' } });
      }

      // Range limit: max 366 days (approx 1y)
      const maxDays = 366;
      const diffDays = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (diffDays > maxDays) {
        return res.status(400).json({ success: false, error: { message: `Range too large (max ${maxDays} days)` } });
      }

      const disabled = this.holidaySvc.calculateDisabledDates(from, to);
      return res.status(200).json({ success: true, data: { disabledDates: disabled } });
    } catch (e) {
      return res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  };
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseIsoDate(s: string): Date | null {
  if (!isIsoDate(s)) return null;
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Validate round trip
  const y2 = dt.getUTCFullYear();
  const m2 = dt.getUTCMonth() + 1;
  const d2 = dt.getUTCDate();
  if (y !== y2 || m !== m2 || d !== d2) return null;
  return dt;
}
