// Minimal Express server exposing station status endpoint for the dashboard
// Swagger-like inline docs provided via JSDoc

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { StationService } from './modules/station/service/StationService';
import { toStationDTO } from './modules/station/domain/entities/Station';
import { HolidayService } from './modules/calendar/service/HolidayService';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const stationService = new StationService();
const holidayService = new HolidayService();

/**
 * GET /api/postazioni/status
 * Summary: Restituisce lo stato corrente delle 12 postazioni in un'unica risposta.
 * Response 200: [{ id: string, name: string, status: 'FREE'|'OCCUPIED'|'UNAVAILABLE', updatedAt?: string }]
 * Notes:
 * - L'endpoint è ottimizzato per una singola chiamata che restituisce tutte le postazioni.
 * - La dashboard può eseguire polling ogni X secondi; la cache è disabilitata tramite header.
 */
app.get('/api/postazioni/status', async (_req, res) => {
  try {
    const all = await stationService.getAll();
    res.setHeader('Cache-Control', 'no-store');
    return res.json(all.map(toStationDTO));
  } catch (e) {
    // avoid leaking internals
    return res.status(500).json({ error: 'Unable to fetch stations' });
  }
});

// For backward compatibility with current frontend demo path /api/stations
app.get('/api/stations', async (_req, res) => {
  try {
    const all = await stationService.getAll();
    res.setHeader('Cache-Control', 'no-store');
    return res.json(all.map(toStationDTO));
  } catch (e) {
    return res.status(500).json({ error: 'Unable to fetch stations' });
  }
});

/**
 * GET /api/calendar/disabled-dates?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns: { disabledDates: string[] }
 */
app.get('/api/calendar/disabled-dates', (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) return res.status(400).json({ error: 'from/to required' });
    const start = new Date(from + 'T00:00:00Z');
    const end = new Date(to + 'T00:00:00Z');
    const list = holidayService.getDisabledDates(start, end);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ disabledDates: list });
  } catch (e) {
    return res.status(500).json({ error: 'Unable to compute disabled dates' });
  }
});

// Helpers for bookings endpoint (in-memory stub for demo/testing)
function pad(n: number) { return n < 10 ? `0${n}` : String(n); }
function toDateKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function addDays(d: Date, n: number) { const c = new Date(d.getFullYear(), d.getMonth(), d.getDate()); c.setDate(c.getDate() + n); return c; }
function seededRandom(seed: number) { let s = seed % 2147483647; return () => (s = (s * 48271) % 2147483647) / 2147483647; }
function hashString(str: string): number { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24); } return Math.abs(h); }

function getAuthUserId(req: express.Request): string {
  // Very light dev stub: prefer explicit header, fallback to token string hash, else 'guest'
  const uid = (req.headers['x-user-id'] as string) || '';
  if (uid) return uid;
  const auth = (req.headers['authorization'] as string) || '';
  if (auth) return 'u_' + hashString(auth).toString(36);
  return 'guest';
}

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

function makeUserBookings(userId: string) {
  const seed = hashString(userId || 'guest');
  const rnd = seededRandom(seed);
  const today = new Date();

  // Generate a pool of bookings around today (-30..+29 days)
  const pool: any[] = [];
  for (let i = -30; i < 30; i++) {
    const d = addDays(today, i);
    const date = toDateKey(d);
    const deskId = String(1 + Math.floor(rnd() * 12));
    const status: BookingStatus = rnd() < 0.12 ? 'CANCELLED' : (rnd() < 0.65 ? 'CONFIRMED' : 'PENDING');
    const hasTimes = rnd() < 0.4;
    let startTime: string | null = null;
    let endTime: string | null = null;
    if (hasTimes) {
      const startHour = 8 + Math.floor(rnd() * 4); // 8..11
      const durationH = 6 + Math.floor(rnd() * 3); // 6..8h
      startTime = `${pad(startHour)}:${rnd() < 0.5 ? '00' : '30'}`;
      const endHour = Math.min(19, startHour + durationH);
      endTime = `${pad(endHour)}:${rnd() < 0.5 ? '00' : '30'}`;
    }
    pool.push({
      id: `${date}:${deskId}`,
      deskId,
      deskName: `Postazione ${deskId}`,
      date,
      status,
      startTime,
      endTime,
      locationName: rnd() < 0.3 ? 'Piano 1 - Open Space' : 'Piano 2 - Sala A',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return pool;
}

function toDomainStatus(item: any, todayStr: string): 'ATTIVA' | 'CANCELLATA' | 'PASSATA' {
  const st = (item.status || '').toUpperCase();
  if (st === 'CANCELLED' || st === 'CANCELED' || st === 'CANCELLATA') return 'CANCELLATA';
  if (item.date < todayStr) return 'PASSATA';
  return 'ATTIVA';
}

function compareByDateId(a: any, b: any, order: 'asc' | 'desc') {
  const cmpDate = a.date.localeCompare(b.date);
  if (cmpDate !== 0) return order === 'asc' ? cmpDate : -cmpDate;
  const cmpId = String(a.id).localeCompare(String(b.id));
  return order === 'asc' ? cmpId : -cmpId;
}

function validateDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

/**
 * GET /api/bookings/me
 * Supports two modes:
 * - Keyset: limit (1..100), cursor (base64 of "date|id"), order (asc|desc), from/to, status
 * - Page/Offset: page (>=1), pageSize (1..100), order (asc|desc), from/to, status
 *
 * Security: dev stub reads user id from x-user-id header or Authorization token hash.
 */
app.get('/api/bookings/me', (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const q = req.query as any;

    // Determine mode
    const hasKeyset = q.limit !== undefined || q.cursor !== undefined;
    const hasPage = q.page !== undefined || q.pageSize !== undefined;

    // Common params
    const rawStatus = (q.status || '').toString().trim().toUpperCase();
    const status: 'ATTIVA' | 'PASSATA' | 'CANCELLATA' | 'ALL' | 'NONE' | '' =
      rawStatus === 'ATTIVA' || rawStatus === 'PASSATA' || rawStatus === 'CANCELLATA' ? rawStatus as any : (rawStatus === 'ALL' || rawStatus === 'NONE' ? rawStatus as any : '');

    const from = (q.from || '').toString();
    const to = (q.to || '').toString();
    const order: 'asc' | 'desc' = (q.order || 'asc').toString().toLowerCase() === 'desc' ? 'desc' : 'asc';

    const todayStr = toDateKey(new Date());

    // Generate dataset for this user
    let items = makeUserBookings(userId);

    // from/to filters
    if (from) {
      if (!validateDateKey(from)) return res.status(400).json({ error: 'invalid_from' });
      items = items.filter((x) => x.date >= from);
    }
    if (to) {
      if (!validateDateKey(to)) return res.status(400).json({ error: 'invalid_to' });
      items = items.filter((x) => x.date <= to);
    }

    // status filter mapping
    if (status && status !== 'ALL' && status !== 'NONE') {
      items = items.filter((x) => toDomainStatus(x, todayStr) === status);
    }

    // sort by date then id
    items.sort((a, b) => compareByDateId(a, b, order));

    // Keyset mode
    if (hasKeyset && !hasPage) {
      let limit = Number(q.limit);
      if (!Number.isFinite(limit)) limit = 20;
      limit = Math.min(Math.max(limit, 1), 100);

      const cursor = (q.cursor || '').toString();
      let startIndex = 0;
      if (cursor) {
        try {
          const decoded = Buffer.from(cursor, 'base64').toString('utf8');
          const [cDate, cId] = decoded.split('|');
          const idx = items.findIndex((it: any) => {
            const cmpDate = it.date.localeCompare(cDate);
            if (cmpDate === 0) {
              const cmpId = String(it.id).localeCompare(String(cId));
              return order === 'asc' ? cmpId > 0 : cmpId < 0;
            }
            return order === 'asc' ? cmpDate > 0 : cmpDate < 0;
          });
          if (idx >= 0) startIndex = idx;
          else startIndex = items.length; // nothing after cursor
        } catch {
          // invalid cursor → ignore (start from 0)
        }
      }
      const page = items.slice(startIndex, startIndex + limit);
      const last = page[page.length - 1];
      const hasNext = startIndex + limit < items.length;
      const nextCursor = last ? Buffer.from(`${last.date}|${last.id}`, 'utf8').toString('base64') : null;
      return res.json({ items: page.map((x) => ({ ...x, status: toDomainStatus(x, todayStr) })), nextCursor, hasNext });
    }

    // Page/Offset mode
    let page = Number(q.page);
    let pageSize = Number(q.pageSize);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 20;
    pageSize = Math.min(Math.max(pageSize, 1), 100);

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    return res.json({
      items: pageItems.map((x) => ({ ...x, status: toDomainStatus(x, todayStr) })),
      page: currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Unable to fetch bookings' });
  }
});

export default app;
