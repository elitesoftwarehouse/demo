/**
 * User repository: persistence functions for users table.
 * - Maps between DB snake_case and app camelCase
 * - Provides create and lookup by email
 */

import { User, UserStatus } from './user.model';
import { query } from '../../db/client';

interface DbUserRow {
  id: string;
  email: string;
  password_hash: string;
  status: string;
  verification_token: string | null;
  verification_expires_at: string | null; // timestamptz -> ISO string
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  // Optional profile columns (may be absent in older schemas)
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  avatar_id?: string | null;
}

function mapRowToUser(row: DbUserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    status: (row.status as UserStatus) || UserStatus.ACTIVE,
    verificationToken: row.verification_token,
    verificationExpiresAt: row.verification_expires_at ? new Date(row.verification_expires_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    // Profile fields (optional)
    firstName: (row as any).first_name ?? null,
    lastName: (row as any).last_name ?? null,
    avatarUrl: (row as any).avatar_url ?? null,
    avatarId: (row as any).avatar_id ?? null,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const sql = 'SELECT * FROM users WHERE email = $1 LIMIT 1';
  const res = await query<DbUserRow>(sql, [email]);
  if (res.rows.length === 0) return null;
  return mapRowToUser(res.rows[0]);
}

export async function findUserById(id: string): Promise<User | null> {
  const sql = 'SELECT * FROM users WHERE id = $1 LIMIT 1';
  const res = await query<DbUserRow>(sql, [id]);
  if (res.rows.length === 0) return null;
  return mapRowToUser(res.rows[0]);
}

interface CreateUserParams {
  email: string;
  passwordHash: string;
  status?: UserStatus;
}

export async function createUser(params: CreateUserParams): Promise<User> {
  const sql = `
    INSERT INTO users (email, password_hash, status)
    VALUES ($1, $2, $3)
    RETURNING id, email, password_hash, status, verification_token, verification_expires_at, created_at, updated_at,
              first_name, last_name, avatar_url, avatar_id
  `;
  const res = await query<DbUserRow>(sql, [
    params.email,
    params.passwordHash,
    params.status ?? UserStatus.ACTIVE,
  ]);
  return mapRowToUser(res.rows[0]);
}

export interface UpdateUserProfileParams {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  avatarId?: string | null;
}

export async function updateUserProfile(userId: string, updates: UpdateUserProfileParams): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [userId];

  function pushField(column: string, value: any) {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  }

  if ('firstName' in updates) pushField('first_name', updates.firstName ?? null);
  if ('lastName' in updates) pushField('last_name', updates.lastName ?? null);
  if ('avatarUrl' in updates) pushField('avatar_url', updates.avatarUrl ?? null);
  if ('avatarId' in updates) pushField('avatar_id', updates.avatarId ?? null);

  if (fields.length === 0) {
    // Nothing to update, just return current user
    return await findUserById(userId);
  }

  const sql = `
    UPDATE users
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, password_hash, status, verification_token, verification_expires_at, created_at, updated_at,
              first_name, last_name, avatar_url, avatar_id
  `;

  const res = await query<DbUserRow>(sql, values);
  if (res.rows.length === 0) return null;
  return mapRowToUser(res.rows[0]);
}
