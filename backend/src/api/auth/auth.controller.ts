/**
 * Auth controller: implements signup endpoint.
 * Framework-agnostic handler signature: (req, res) objects similar to Express.
 * This keeps compilation simple while enabling future framework wiring.
 */

import { hashPassword } from '../../security/password.service';
import { validateEmail, validatePassword } from '../../security/validation.service';
import { createUser } from '../../modules/users/user.repository';
import { userToPublic } from '../../modules/users/user.model';

// Minimal Request/Response interfaces compatible with Express-like frameworks
export interface RequestLike {
  body?: any;
}

export interface ResponseLike {
  status(code: number): this;
  json(payload: any): void;
}

// Utility to detect unique violation from Postgres error
function isUniqueViolation(err: any): boolean {
  // Postgres error code 23505 is unique_violation
  return !!(err && (err.code === '23505' || /unique/i.test(String(err.message || ''))));
}

export async function signupHandler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const { email, password } = (req.body || {}) as { email?: string; password?: string };

    // Validate inputs
    const vEmail = validateEmail(email || '');
    if (!vEmail.valid) {
      res.status(400).json({ error: 'invalid_input', details: { email: vEmail.error } });
      return;
    }

    const vPwd = validatePassword(password || '');
    if (!vPwd.valid) {
      res.status(400).json({ error: 'invalid_input', details: { password: vPwd.errors } });
      return;
    }

    const normalizedEmail = vEmail.normalized!;

    // Hash password securely
    const passwordHash = await hashPassword(password!);

    // Create user (DB enforces unique email; catch race conditions)
    try {
      const user = await createUser({ email: normalizedEmail, passwordHash });
      const publicUser = userToPublic(user);
      res.status(201).json({ user: publicUser });
      return;
    } catch (dbErr: any) {
      if (isUniqueViolation(dbErr)) {
        res.status(409).json({ error: 'email_already_registered' });
        return;
      }
      // Generic DB error
      res.status(500).json({ error: 'internal_error' });
      return;
    }
  } catch (err) {
    // Do not leak details; ensure no password or hash is logged here
    res.status(500).json({ error: 'internal_error' });
  }
}
