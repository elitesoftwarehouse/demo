/**
 * Repository for coworking_closures table.
 * Provides functions to query whether a given date is closed (single or recurring).
 */

import { query } from '../../db/client';

export type ClosureType = 'single' | 'recurring';

export interface CoworkingClosure {
  id: string;
  type: ClosureType;
  date?: Date | null;
  dayOfWeek?: number | null; // 0=Sun .. 6=Sat
  startDate?: Date | null;
  endDate?: Date | null;
  reason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DbClosureRow {
  id: string;
  type: string;
  date: string | null; // DATE
  day_of_week: number | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(r: DbClosureRow): CoworkingClosure {
  return {
    id: r.id,
    type: r.type as ClosureType,
    date: r.date ? new Date(`${r.date}T00:00:00.000Z`) : null,
    dayOfWeek: r.day_of_week ?? null,
    startDate: r.start_date ? new Date(`${r.start_date}T00:00:00.000Z`) : null,
    endDate: r.end_date ? new Date(`${r.end_date}T00:00:00.000Z`) : null,
    reason: r.reason,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

/**
 * Returns true if the provided UTC date (YYYY-MM-DD semantics) is closed by any rule.
 * - Matches single-date closures (type='single' AND date = $1)
 * - Matches recurring closures (type='recurring' AND day_of_week = $2 AND within optional range)
 */
export async function isClosedDate(date: Date): Promise<boolean> {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const dateOnly = new Date(Date.UTC(y, m, d));
  const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dow = dateOnly.getUTCDay(); // 0..6

  const sql = `
    SELECT 1 FROM coworking_closures
    WHERE (
      -- Single date exact match
      (type = 'single' AND date = $1)
      OR
      -- Recurring by day of week, optionally bound to a date range
      (type = 'recurring' AND day_of_week = $2 AND
        (start_date IS NULL OR start_date <= $1::date) AND
        (end_date IS NULL OR end_date >= $1::date)
      )
    )
    LIMIT 1
  `;
  const res = await query(sql, [iso, dow]);
  return res.rows.length > 0;
}

/**
 * Fetch all closure entries, useful for admin/config screens.
 */
export async function listClosures(): Promise<CoworkingClosure[]> {
  const res = await query<DbClosureRow>('SELECT * FROM coworking_closures ORDER BY type, date NULLS LAST, day_of_week NULLS LAST');
  return res.rows.map(mapRow);
}

/**
 * Upsert helpers for seed and admin tools.
 */
export interface UpsertClosureInput {
  id?: string;
  type: ClosureType;
  date?: string | null; // YYYY-MM-DD for single
  dayOfWeek?: number | null; // for recurring
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null;   // YYYY-MM-DD
  reason?: string | null;
}

export async function insertClosure(input: UpsertClosureInput): Promise<CoworkingClosure> {
  const sql = `
    INSERT INTO coworking_closures (type, date, day_of_week, start_date, end_date, reason)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const params = [
    input.type,
    input.date || null,
    input.dayOfWeek ?? null,
    input.startDate || null,
    input.endDate || null,
    input.reason || null,
  ];
  const res = await query<DbClosureRow>(sql, params);
  return mapRow(res.rows[0]);
}

export async function deleteClosure(id: string): Promise<void> {
  await query('DELETE FROM coworking_closures WHERE id = $1', [id]);
}
