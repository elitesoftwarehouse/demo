// UserRepository - interface and Prisma implementation placeholder
// IMPORTANT: Ensure no sensitive fields are logged

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  salt?: string | null;
  status?: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DISABLED';
  verificationToken?: string | null;
  verificationExpiresAt?: Date | null;
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  salt: string | null;
  created_at: Date;
  updated_at: Date;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DISABLED';
  verification_token: string | null;
  verification_expires_at: Date | null;
}

export interface IUserRepository {
  create(data: CreateUserInput): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
}

// Placeholder implementation using SQL (to be wired with actual DB client)
export class UserRepository implements IUserRepository {
  async create(data: CreateUserInput): Promise<UserRecord> {
    // Placeholder - to be replaced with actual DB access (e.g., Prisma)
    throw new Error('Not implemented: connect to database to insert user');
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    // Placeholder - to be replaced with actual DB access (e.g., Prisma)
    throw new Error('Not implemented: connect to database to query user by email');
  }
}
