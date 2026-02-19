// Minimal in-memory user repository for MVP.
// In real project, integrate with Prisma/PostgreSQL.

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role?: string;
  status?: 'ACTIVE' | 'DISABLED' | 'BANNED' | 'PENDING';
  tenantId?: string;
}

const users: UserRecord[] = [];

class UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  // Helper for tests/dev to seed a user
  async upsert(user: UserRecord): Promise<UserRecord> {
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    return user;
  }
}

export const userRepository = new UserRepository();
