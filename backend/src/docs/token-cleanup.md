Token/session cleanup strategy

Overview
- user_sessions table stores refresh token hashes with expires_at and revoked_at.
- Implement periodic cleanup job to remove expired sessions, keeping table small and queries fast.

Options
- Application-level cron/interval job calling deleteExpiredSessions() every few hours.
- Database-level scheduled job (e.g., using pg_cron or external scheduler) running DELETE WHERE expires_at <= NOW().

Recommended app job (pseudo-code)

import { deleteExpiredSessions } from '../modules/sessions/session.repository';

async function cleanupLoop() {
  const intervalMs = Number(process.env.SESSION_CLEANUP_INTERVAL_MS || 6 * 60 * 60 * 1000); // 6h
  setInterval(async () => {
    try {
      const deleted = await deleteExpiredSessions();
      // in real app, log metrics: console.info(`[cleanup] removed ${deleted} expired sessions`)
    } catch (e) {
      // log warning
    }
  }, intervalMs);
}

Notes
- deleteExpiredSessions must be idempotent and safe.
- Keep only token hashes; never store plaintext refresh tokens.
- If regulatory constraints apply, consider soft-deleting or archiving before deletion.
