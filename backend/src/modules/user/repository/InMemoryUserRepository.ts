// In-memory repository for testing the signup flow without a DB
// Not for production use. Does not store sensitive password in plain text.

import { CreateUserInput, IUserRepository, UserRecord } from './UserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private items: UserRecord[] = [];

  async create(data: CreateUserInput): Promise<UserRecord> {
    const exists = this.items.find((u) => u.email === data.email);
    if (exists) {
      const err: any = new Error('duplicate key value violates unique constraint');
      err.code = 'P2002';
      throw err;
    }
    const now = new Date();
    const rec: UserRecord = {
      id: cryptoRandomId(),
      email: data.email,
      password_hash: data.passwordHash,
      salt: data.salt ?? null,
      created_at: now,
      updated_at: now,
      status: (data.status as any) || 'ACTIVE',
      verification_token: data.verificationToken ?? null,
      verification_expires_at: data.verificationExpiresAt ?? null,
    };
    this.items.push(rec);
    return rec;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.items.find((u) => u.email === email) || null;
  }
}

function cryptoRandomId(): string {
  // Simple random id for in-memory usage
  const b = typeof crypto !== 'undefined' && (crypto as any).getRandomValues
    ? (crypto as any).getRandomValues(new Uint8Array(16))
    : require('crypto').randomBytes(16);
  const arr = b instanceof Buffer ? new Uint8Array(b) : (b as Uint8Array);
  const hex = Array.from(arr).map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}
