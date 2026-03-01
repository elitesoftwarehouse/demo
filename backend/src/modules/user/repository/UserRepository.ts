// Repository for User persistence (to be implemented with ORM/DB client)
// Follow project layering: service uses repository; no HTTP concerns here.

import type { User } from '../domain/entities/User';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  salt?: string | null;
  status?: User['status'];
  verificationToken?: string | null;
  verificationExpiresAt?: string | null; // ISO
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}
