/**
 * Booking repository
 */

import { query } from '../../db/client';
import type { Booking, BookingStatus, BookingState } from './booking.model';
import { computeBookingState } from './booking.state.service';

interface DbBookingRow {
  id: string;
  user_id: string;
  desk_id: string;
  date: string; // YYYY-MM-DD
  status: string;
  state?: string; // new column
  created_at: string;
  updated_at: string;
  // New audit columns (may be absent in older schemas)
  canceled_at?: string | null;
  canceled_by?: string | null;
  cancel_reason?: string | null;
}

function mapRow(row: DbBookingRow): Booking {
  const b: Booking = {
    id: row.id,
    userId: row.user_id,
    deskId: row.desk_id,
    date: new Date(`${row.date}T00:00:00.000Z`),
    status: (row.status as BookingStatus) || 'confirmed',
    // Preserve DB state if any, otherwise compute on-the-fly
    state: ((row as any).state as BookingState) || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };

  // If state is not persisted, compute it deterministically
  if (!b.state) {
    b.state = computeBookingState({ date: b.date });
  }
  return b;
}

export interface CreateBookingParams {
  userId: string;
  deskId: string;
  date: Date; // normalized date-only UTC
  status?: BookingStatus;
  // Client must NOT control state; ignore any incoming value
}

export async function createBooking(params: CreateBookingParams): Promise<Booking> {
  const sql = `
    INSERT INTO bookings (user_id, desk_id, date, status)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const res = await query<DbBookingRow>(sql, [
    params.userId,
    params.deskId,
    // Store as DATE without time in DB; pass ISO yyyy-mm-dd
    params.date.toISOString().slice(0, 10),
    params.status || 'confirmed',
  ]);
  return mapRow(res.rows[0]);
}

export async function findBookingByDeskAndDate(deskId: string, date: Date): Promise<Booking | null> {
  // Exclude canceled bookings when checking existence/availability
  const sql =
    "SELECT * FROM bookings WHERE desk_id = $1 AND date = $2 AND (state IS NULL OR state <> 'CANCELLATA') LIMIT 1";
  const res = await query<DbBookingRow>(sql, [deskId, date.toISOString().slice(0, 10)]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findBookingById(id: string): Promise<Booking | null> {
  const sql = 'SELECT * FROM bookings WHERE id = $1 LIMIT 1';
  const res = await query<DbBookingRow>(sql, [id]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function countUserBookingsOnDate(userId: string, date: Date): Promise<number> {
  // Exclude canceled bookings from counting constraints
  const sql =
    "SELECT COUNT(1) AS c FROM bookings WHERE user_id = $1 AND date = $2 AND (state IS NULL OR state <> 'CANCELLATA')";
  const res = await query<{ c: string }>(sql, [userId, date.toISOString().slice(0, 10)]);
  const c = res.rows[0] && (res.rows[0] as any).c;
  return c ? parseInt(c, 10) : 0;
}

export interface ListUserBookingsOptions {
  includeCanceled?: boolean; // for future expansion; assuming "canceled" status would exist
  page?: number; // 1-based
  size?: number; // page size
  nowIsoDate?: string; // optional override for testing, format YYYY-MM-DD
  // New: filter by computed application state (ATTIVA | PASSATA | CANCELLATA)
  state?: BookingState | 'ALL';
}

export interface UserBookingItemDto {
  id: string;
  startDate: string; // ISO 8601 date (YYYY-MM-DD)
  endDate: string | null; // null for date-only bookings
  deskId: string;
  status: string; // keep as string for UI
  notes?: string | null;
  tags?: string[] | null;
  state?: BookingState; // expose new state in DTO
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

/**
 * Returns user bookings ordered chronologically:
 * - future first by date ASC
 * - then past (< today) descending by date
 * Allows pagination via page/size.
 * Supports optional state filter (ATTIVA | PASSATA | CANCELLATA).
 */
export async function listUserBookings(
  userId: string,
  opts?: ListUserBookingsOptions,
): Promise<PagedResult<UserBookingItemDto>> {
  const page = Math.max(1, Math.floor(opts?.page || 1));
  const sizeRaw = Math.floor(opts?.size || 20);
  const size = Math.min(100, Math.max(1, sizeRaw));
  const offset = (page - 1) * size;

  // Determine today (UTC date)
  const todayIso = opts?.nowIsoDate || new Date().toISOString().slice(0, 10);

  const notCanceledPredicate = "(state IS NULL OR state <> 'CANCELLATA')";

  const stateFilter = (opts?.state || 'ALL') as BookingState | 'ALL';

  let dataSql = '';
  let countSql = '';
  let params: any[] = [];

  if (stateFilter === 'ATTIVA') {
    // Future or today, not canceled
    dataSql = `
      SELECT * FROM bookings
      WHERE user_id = $1 AND date >= $2 AND ${notCanceledPredicate}
      ORDER BY date ASC
      OFFSET $3 LIMIT $4
    `;
    countSql = `SELECT COUNT(1) AS c FROM bookings WHERE user_id = $1 AND date >= $2 AND ${notCanceledPredicate}`;
    params = [userId, todayIso, offset, size];
  } else if (stateFilter === 'PASSATA') {
    // Past, not canceled
    dataSql = `
      SELECT * FROM bookings
      WHERE user_id = $1 AND date < $2 AND ${notCanceledPredicate}
      ORDER BY date DESC
      OFFSET $3 LIMIT $4
    `;
    countSql = `SELECT COUNT(1) AS c FROM bookings WHERE user_id = $1 AND date < $2 AND ${notCanceledPredicate}`;
    params = [userId, todayIso, offset, size];
  } else if (stateFilter === 'CANCELLATA') {
    // Explicitly canceled
    dataSql = `
      SELECT * FROM bookings
      WHERE user_id = $1 AND state = 'CANCELLATA'
      ORDER BY canceled_at DESC NULLS LAST, date DESC
      OFFSET $2 LIMIT $3
    `;
    countSql = `SELECT COUNT(1) AS c FROM bookings WHERE user_id = $1 AND state = 'CANCELLATA'`;
    params = [userId, offset, size];
  } else {
    // Default ALL: keep existing union logic while excluding canceled unless includeCanceled
    const excludeCanceled = opts?.includeCanceled ? false : true;
    const activePredicate = excludeCanceled ? `AND ${notCanceledPredicate}` : '';

    dataSql = `
      WITH future AS (
        SELECT *, 0 AS bucket FROM bookings WHERE user_id = $1 AND date >= $2 ${activePredicate}
      ), past AS (
        SELECT *, 1 AS bucket FROM bookings WHERE user_id = $1 AND date < $2 ${activePredicate}
      ), concat AS (
        SELECT * FROM future
        UNION ALL
        SELECT * FROM past
      )
      SELECT * FROM concat
      ORDER BY bucket ASC,
        CASE WHEN bucket = 0 THEN date END ASC NULLS LAST,
        CASE WHEN bucket = 1 THEN date END DESC NULLS LAST
      OFFSET $3 LIMIT $4
    `;

    countSql = `SELECT COUNT(1) AS c FROM bookings WHERE user_id = $1 ${activePredicate}`;
    params = [userId, todayIso, offset, size];
  }

  const [dataRes, countRes] = await Promise.all([
    query<DbBookingRow & { bucket?: number }>(dataSql, params),
    query<{ c: string }>(countSql, [userId, ...(dataSql.includes('$2') && countSql.includes('$2') ? [todayIso] : [])]),
  ]);

  const total = countRes.rows[0] ? parseInt((countRes.rows[0] as any).c, 10) : 0;
  const items: UserBookingItemDto[] = dataRes.rows.map((r) => {
    const state =
      ((r as any).state as BookingState) ||
      computeBookingState({ date: new Date(`${r.date}T00:00:00.000Z`) });
    return {
      id: r.id,
      startDate: (r as any).date, // already YYYY-MM-DD from DB
      endDate: null,
      deskId: r.desk_id,
      status: (r as any).status,
      notes: null,
      tags: null,
      state,
    };
  });

  return { items, page, size, total };
}

export interface BookingCancellationAudit {
  canceledAt?: Date | null;
  canceledBy?: string | null; // user id
  cancelReason?: string | null; // free-text or enum key
}

export async function getBookingCancellationAudit(
  bookingId: string,
): Promise<BookingCancellationAudit | null> {
  const sql =
    'SELECT canceled_at, canceled_by, cancel_reason FROM bookings WHERE id = $1 LIMIT 1';
  const res = await query<Pick<DbBookingRow, 'canceled_at' | 'canceled_by' | 'cancel_reason'>>(sql, [
    bookingId,
  ]);
  const row = res.rows[0];
  if (!row) return null;
  return {
    canceledAt: row.canceled_at ? new Date(row.canceled_at) : null,
    canceledBy: row.canceled_by || null,
    cancelReason: row.cancel_reason || null,
  };
}

export async function cancelBookingForUserWithAudit(
  bookingId: string,
  userId: string,
  options?: { reason?: string; todayIso?: string },
): Promise<Booking | null> {
  const today = options?.todayIso || new Date().toISOString().slice(0, 10);
  const sql = `
    UPDATE bookings
    SET state = $3,
        canceled_at = NOW(),
        canceled_by = $2,
        cancel_reason = $4,
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2 AND date >= $5
    RETURNING *
  `;
  const res = await query<DbBookingRow>(sql, [
    bookingId,
    userId,
    'CANCELLATA',
    options?.reason || 'USER_REQUEST',
    today,
  ]);
  if (!res.rows[0]) return null;
  return mapRow(res.rows[0]);
}

export async function cancelBookingForUser(
  bookingId: string,
  userId: string,
  todayIso?: string,
): Promise<Booking | null> {
  // Keep backward compatibility while ensuring audit is captured
  return cancelBookingForUserWithAudit(bookingId, userId, {
    reason: 'USER_REQUEST',
    todayIso,
  });
}
