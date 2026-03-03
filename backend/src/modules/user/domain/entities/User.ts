// Domain entity for User aligned with Prisma schema
// Sensitive fields must never be logged: passwordHash, salt, verificationToken

export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING';

export interface User {
  id: string;
  email: string;
  passwordHash: string; // NEVER log
  salt?: string | null; // NEVER log
  accountStatus: UserStatus;
  verificationToken?: string | null; // NEVER log
  verificationExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Profile fields
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  avatarId?: string | null;
}
