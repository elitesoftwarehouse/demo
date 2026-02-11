/**
 * User domain model for SmartDesk Coworking PWA.
 *
 * Conventions:
 * - Application layer: camelCase
 * - Database layer: snake_case
 * - Sensitive fields (passwordHash, verificationToken) MUST NEVER be logged.
 */

import { redact } from '../../utils/redact';

/**
 * Account status lifecycle.
 * Keep minimal for now; can be extended (e.g., PENDING_VERIFICATION) when email verification is enabled.
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
}

/**
 * User entity as used in the application code.
 */
export interface User {
  id: string; // UUID (v4)
  email: string; // normalized/lower-cased at application boundary; stored as CITEXT in DB
  passwordHash: string; // hash produced by a KDF (e.g., bcrypt/argon2). Do NOT store plain passwords.
  createdAt: Date;
  updatedAt: Date;
  status: UserStatus;
  verificationToken?: string | null; // optional: for future email verification
  verificationExpiresAt?: Date | null; // optional expiry for verification token
  // Profile fields (optional)
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  avatarId?: string | null;
}

/**
 * Fields considered sensitive and never to be logged or exposed in APIs.
 */
export const USER_SENSITIVE_FIELDS: Array<keyof User> = [
  'passwordHash',
  'verificationToken',
];

/**
 * Return a sanitized clone of the user object suitable for logging.
 * Sensitive fields are replaced with the literal "[REDACTED]".
 */
export function userForLog<T extends Partial<User>>(user: T): T {
  return redact(user, USER_SENSITIVE_FIELDS as string[]);
}

/**
 * Return a public representation of a user safe to return to clients.
 * Removes sensitive fields entirely.
 */
export function userToPublic<T extends Partial<User>>(user: T): Omit<T, 'passwordHash' | 'verificationToken'> {
  const { passwordHash, verificationToken, ...rest } = (user || {}) as any;
  return rest;
}
