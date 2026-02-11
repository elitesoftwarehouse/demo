/**
 * Lightweight PostgreSQL client wrapper using 'pg'.
 * Provides a singleton Pool and helper to run parametrized queries.
 */

// Avoid importing types from @types/pg in this demo; use shims.
const { Pool } = require('pg');

export interface QueryResultRow {
  [column: string]: any;
}

export interface QueryResult<T extends QueryResultRow = any> {
  rows: T[];
}

let _pool: any;

export function getDbPool(): any {
  if (_pool) return _pool;
  const connectionString = process.env.DATABASE_URL;
  const config = connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'smartdesk',
      };

  _pool = new Pool({
    ...config,
    max: process.env.PGPOOL_MAX ? parseInt(process.env.PGPOOL_MAX, 10) : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  return _pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const pool = getDbPool();
  const res = await pool.query(text, params);
  return res;
}
