/**
 * Profile controller: view and update current authenticated user's profile.
 * Endpoints (framework-agnostic):
 * - GET /api/me -> returns current user's public profile
 * - PUT/PATCH /api/me -> updates firstName, lastName, avatarUrl/avatarId
 */

import type { RequestLike, ResponseLike } from '../auth/auth.controller';
import type { AuthenticatedRequestLike } from '../auth/jwt.middleware';
import { findUserById, updateUserProfile } from '../../modules/users/user.repository';
import { userToPublic } from '../../modules/users/user.model';

// Input validation helpers
function isNonEmptyString(v: any): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function sanitizeName(v: string): string {
  // Trim and collapse inner whitespace; limit length
  const s = v.replace(/\s+/g, ' ').trim();
  return s.slice(0, 100);
}

function sanitizeUrl(v: string): string {
  const s = v.trim();
  // Basic allow-list: http(s) URLs only, limit length
  if (!/^https?:\/\//i.test(s)) return '';
  return s.slice(0, 2048);
}

export async function getMeHandler(req: AuthenticatedRequestLike, res: ResponseLike): Promise<void> {
  try {
    if (!req || !req.user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const user = await findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    // Map to public DTO
    const dto = userToPublic(user);
    res.status(200).json({ user: dto });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
}

export async function updateMeHandler(req: AuthenticatedRequestLike & RequestLike, res: ResponseLike): Promise<void> {
  try {
    if (!req || !req.user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const body = (req.body || {}) as {
      firstName?: any;
      lastName?: any;
      avatarUrl?: any;
      avatarId?: any;
    };

    const updates: any = {};
    const errors: Record<string, string> = {};

    if ('firstName' in body) {
      if (body.firstName === null || body.firstName === '') {
        updates.firstName = null;
      } else if (isNonEmptyString(body.firstName)) {
        updates.firstName = sanitizeName(body.firstName);
      } else {
        errors.firstName = 'invalid_type';
      }
    }

    if ('lastName' in body) {
      if (body.lastName === null || body.lastName === '') {
        updates.lastName = null;
      } else if (isNonEmptyString(body.lastName)) {
        updates.lastName = sanitizeName(body.lastName);
      } else {
        errors.lastName = 'invalid_type';
      }
    }

    if ('avatarUrl' in body) {
      if (body.avatarUrl === null || body.avatarUrl === '') {
        updates.avatarUrl = null;
      } else if (isNonEmptyString(body.avatarUrl)) {
        const safe = sanitizeUrl(body.avatarUrl);
        if (!safe) {
          errors.avatarUrl = 'invalid_url';
        } else {
          updates.avatarUrl = safe;
        }
      } else {
        errors.avatarUrl = 'invalid_type';
      }
    }

    if ('avatarId' in body) {
      if (body.avatarId === null || body.avatarId === '') {
        updates.avatarId = null;
      } else if (isNonEmptyString(body.avatarId)) {
        updates.avatarId = body.avatarId.slice(0, 200);
      } else {
        errors.avatarId = 'invalid_type';
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'invalid_input', details: errors });
      return;
    }

    // Persist
    const updated = await updateUserProfile(req.user.id, updates);
    if (!updated) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Simple audit log (avoid sensitive data)
    try {
      const fields = Object.keys(updates);
      // eslint-disable-next-line no-console
      console.info('[audit] user_profile_updated', { userId: req.user.id, fields });
    } catch (_) {}

    const dto = userToPublic(updated);
    res.status(200).json({ user: dto });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
}
