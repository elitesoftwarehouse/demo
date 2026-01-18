// Combined in-memory repository implementing both IUserRepository and IRefreshTokenRepository
// Useful for local development and tests without a real DB

import { InMemoryUserRepository } from '../../user/repository/InMemoryUserRepository';
import type { IRefreshTokenRepository, CreateRefreshTokenInput, RefreshTokenRecord } from './RefreshTokenRepository';
import { InMemoryRefreshTokenRepository } from './InMemoryRefreshTokenRepository';

export class CombinedInMemoryAuthRepository extends InMemoryUserRepository implements IRefreshTokenRepository {
  private readonly refreshRepo = new InMemoryRefreshTokenRepository();

  // IRefreshTokenRepository methods delegate to internal repo
  async createRefreshToken(data: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    return this.refreshRepo.createRefreshToken(data);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.refreshRepo.findRefreshTokenByHash(tokenHash);
  }

  async findRefreshTokenById(id: string): Promise<RefreshTokenRecord | null> {
    return this.refreshRepo.findRefreshTokenById(id);
  }

  async findActiveTokensByUserId(userId: string, at?: Date): Promise<RefreshTokenRecord[]> {
    return this.refreshRepo.findActiveTokensByUserId(userId, at);
  }

  async revokeRefreshToken(id: string, reason?: string, replacementTokenId?: string | null): Promise<void> {
    return this.refreshRepo.revokeRefreshToken(id, reason, replacementTokenId);
  }

  async revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
    return this.refreshRepo.revokeAllUserTokens(userId, reason);
  }

  async cleanupExpired(before?: Date): Promise<number> {
    return this.refreshRepo.cleanupExpired(before);
  }
}
