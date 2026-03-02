// Minimal in-memory user repository to simulate DB until Prisma is integrated
// In real implementation, replace with Prisma queries

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role?: 'USER' | 'ADMIN';
  status?: 'ACTIVE' | 'DISABLED' | 'BANNED';
}

const users: UserEntity[] = [];

class UserRepository {
  async findByEmail(email: string): Promise<UserEntity | null> {
    const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    return u || null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const u = users.find((x) => x.id === id);
    return u || null;
  }

  // helper to seed for tests/dev
  async upsert(user: UserEntity): Promise<UserEntity> {
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) users[idx] = user; else users.push(user);
    return user;
  }
}

export const userRepository = new UserRepository();
