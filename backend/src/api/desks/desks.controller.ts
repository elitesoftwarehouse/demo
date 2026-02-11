/**
 * Desks API controller - framework agnostic request/response like other controllers
 */

import type { RequestLike, ResponseLike } from '../auth/auth.controller';
import { getCurrentDesks } from '../../modules/desks/desk.repository';

export async function getDesksStatusHandler(_req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const desks = await getCurrentDesks();
    res.status(200).json({ desks });
  } catch (e: any) {
    res.status(500).json({ error: 'desks.fetch_failed', message: e?.message || 'error' });
  }
}
