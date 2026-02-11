/**
 * Booking cancellation controller (framework-agnostic)
 * Endpoint for users to cancel their own booking, honoring the 24h cutoff.
 *
 * Route suggestions (to be wired by HTTP framework):
 * - POST /api/bookings/:id/cancel
 * - or DELETE /api/bookings/:id (semantics may vary)
 */

import type { RequestLike, ResponseLike } from '../auth/auth.controller';
import type { AuthenticatedRequestLike } from '../auth/jwt.middleware';
import { findBookingById } from '../../modules/bookings/booking.repository';
import { decideCancellation, getCancellationPolicyFromEnv } from '../../modules/bookings/booking.cancellation.service';
import { query } from '../../db/client';

// Minimal logger placeholder; in real app replace with structured logger
function logInfo(msg: string, meta?: any) { /* no-op in demo */ }
function logWarn(msg: string, meta?: any) { /* no-op in demo */ }

export async function cancelBookingHandler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const anyReq = req as AuthenticatedRequestLike & { params?: Record<string, string> };
    const userId = anyReq.user && anyReq.user.id;
    const bookingId = (anyReq.params && anyReq.params.id) || (anyReq.body && anyReq.body.id);

    if (!userId) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    if (!bookingId) {
      res.status(400).json({ error: 'invalid_input', details: { id: 'booking.id.required' } });
      return;
    }

    const booking = await findBookingById(bookingId);
    if (!booking || booking.userId !== userId) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Decide according to policy
    const decision = decideCancellation(booking, new Date(), getCancellationPolicyFromEnv());
    if (!decision.allowed) {
      logWarn('booking.cancel.denied', { bookingId, userId, reason: decision.reason, hours: decision.hoursBeforeStart });
      res.status(403).json({ error: 'BUSINESS_RULE_VIOLATION', message: decision.reason, meta: { hoursBeforeStart: decision.hoursBeforeStart } });
      return;
    }

    // Perform soft-cancel by updating state column
    const sql = `
      UPDATE bookings
      SET state = $2, updated_at = NOW()
      WHERE id = $1 AND user_id = $3
      RETURNING *
    `;
    const dbRes = await query(sql, [bookingId, 'CANCELLATA', userId]);
    if (!dbRes.rows[0]) {
      res.status(409).json({ error: 'conflict', message: 'booking.update_failed' });
      return;
    }

    logInfo('booking.cancel.success', { bookingId, userId });
    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'internal_error' });
  }
}
