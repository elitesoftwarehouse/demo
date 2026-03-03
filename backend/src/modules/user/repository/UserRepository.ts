// Repository skeleton for User entity using Prisma Client
// Note: we do not implement full logic here, but define patterns and avoid logging sensitive fields

import { PrismaClient } from '@prisma/client';
import { User } from '../domain/entities/User';

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.map(user) : null;
  }

  async create(data: {
    email: string;
    passwordHash: string;
    salt?: string | null;
    verificationToken?: string | null;
    verificationExpiresAt?: Date | null;
  }): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        salt: data.salt ?? null,
        verificationToken: data.verificationToken ?? null,
        verificationExpiresAt: data.verificationExpiresAt ?? null,
      },
    });
    return this.map(created);
  }

  private map(entity: any): User {
    return {
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      salt: entity.salt,
      accountStatus: entity.accountStatus,
      verificationToken: entity.verificationToken,
      verificationExpiresAt: entity.verificationExpiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    } as User;
  }
}
