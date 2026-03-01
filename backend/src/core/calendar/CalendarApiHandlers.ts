// CalendarApiHandlers — Express-like handler to expose disabled dates for date picker
// Endpoint example: GET /api/calendar/disabled-dates?from=YYYY-MM-DD&to=YYYY-MM-DD
// Validates params and uses HolidayService to compute Sundays + Italian holidays + Easter Monday.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { HolidayService } from './HolidayService';

export type RequestLike = IncomingMessage & {
  // Optional extension if using a framework that parses query for you
  query?: Record<string, any>;
};

export type ResponseLike = ServerResponse & {
  json?: (body: any) => void;
  status?: (code: number) => ResponseLike;
};

export type NextFunction = (err?: any) => void;

export type DisabledDatesHandlerOptions = {
  // Override default HolidayService (e.g., to inject extras or custom TZ)
  service?: HolidayService;
  // Maximum allowed range in days (inclusive). Default: env CALENDAR_DISABLED_MAX_DAYS or 366
  maxRangeDays?: number;
};

function sendJson(res: ResponseLike, code: number, body: any) {
  if (typeof res.status === 'function') res.status(code);
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (typeof res.json === 'function') return res.json(body);
  res.end(JSON.stringify(body));
}

function badRequest(res: ResponseLike, message: string) {
  return sendJson(res, 400, { statusCode: 400, error: 'Bad Request', message });
}

function serverError(res: ResponseLike, message?: string) {
  return sendJson(res, 500, { statusCode: 500, error: 'Internal Server Error', message: message || 'Errore interno.' });
}

function parseQuery(req: RequestLike): URLSearchParams {
  // Prefer framework-provided query if present
  const q = (req as any).query as Record<string, any> | undefined;
  if (q && typeof q === 'object') {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (Array.isArray(v)) v.forEach((x) => usp.append(k, String(x)));
      else if (v != null) usp.set(k, String(v));
    }
    return usp;
  }
  const url = (req.url || '').startsWith('http') ? req.url! : `http://localhost${req.url || ''}`;
  try {
    const u = new URL(url);
    return u.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toUtcDate(s: string): Date {
  // Interpret as local calendar date -> UTC midnight of that date
  const [y, m, d] = s.split('-').map((n) => Number(n));
  return new Date(Date.UTC(y, m - 1, d));
}

function daysDiffInclusive(aIso: string, bIso: string): number {
  const a = toUtcDate(aIso).getTime();
  const b = toUtcDate(bIso).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((b - a) / oneDay) + 1;
}

export function createDisabledDatesHandler(options: DisabledDatesHandlerOptions = {}) {
  const maxDays = Number.parseInt(process.env.CALENDAR_DISABLED_MAX_DAYS || '366', 10);
  const optMax = options.maxRangeDays && Number.isFinite(options.maxRangeDays) ? Math.max(1, Math.trunc(options.maxRangeDays)) : undefined;
  const allowedMax = optMax ?? maxDays;
  const service = options.service || new HolidayService({ timeZone: 'Europe/Rome', strictMode: true });

  return async function disabledDatesHandler(req: RequestLike, res: ResponseLike, _next?: NextFunction) {
    try {
      const params = parseQuery(req);
      const from = (params.get('from') || '').trim();
      const to = (params.get('to') || '').trim();

      if (!from || !to) return badRequest(res, "Parametri 'from' e 'to' sono obbligatori (YYYY-MM-DD).");
      if (!isIsoDate(from) || !isIsoDate(to)) return badRequest(res, "Formato data non valido. Usa YYYY-MM-DD.");

      // Ensure from <= to
      if (from > to) return badRequest(res, "Il parametro 'from' deve essere minore o uguale a 'to'.");

      const span = daysDiffInclusive(from, to);
      if (!Number.isFinite(span) || span <= 0) return badRequest(res, 'Intervallo date non valido.');
      if (span > allowedMax) return badRequest(res, `Intervallo troppo esteso. Massimo ${allowedMax} giorni.`);

      const disabled = service.getDisabledDates(from, to);
      const dates = disabled.map((d) => d.date);

      return sendJson(res, 200, { disabledDates: dates });
    } catch (err: any) {
      return serverError(res, 'Impossibile calcolare le date disabilitate.');
    }
  };
}

export type DisabledDatesHandler = ReturnType<typeof createDisabledDatesHandler>;
