// Simple cleanup job function to purge expired refresh tokens
// This is a generic function; scheduling (cron/queue) is out of scope here.

import type { IRefreshTokenRepository } from '../repository/RefreshTokenRepository';

export async function cleanupExpiredRefreshTokens(repo: IRefreshTokenRepository, before?: Date): Promise<{ deleted: number; at: Date } > {
  const at = before ?? new Date();
  const deleted = await repo.cleanupExpired(at);
  return { deleted, at };
}
