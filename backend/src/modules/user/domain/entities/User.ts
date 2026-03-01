// Domain entity for User aligned with project conventions
// Sensitive fields must not be logged or exposed

export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DISABLED';

export interface User {
  id: string;
  email: string;
  passwordHash: string; // NEVER log or expose
  salt?: string | null; // Optional if hashing lib already manages salt
  status: UserStatus;
  verificationToken?: string | null;
  verificationExpiresAt?: string | null; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
