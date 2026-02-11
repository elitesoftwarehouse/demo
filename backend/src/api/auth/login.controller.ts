/**
 * Login controller: email+password -> JWT access (and refresh) tokens
 * Framework-agnostic handler signature (RequestLike/ResponseLike) from auth.controller.ts
 */

import { verifyPassword } from '../../security/password.service';
import { findUserByEmail } from '../../modules/users/user.repository';
import { UserStatus } from '../../modules/users/user.model';
import { signAccessToken, signRefreshToken, hashRefreshToken, decodeJwt } from '../../security/jwt.service';
import { validateEmail } from '../../security/validation.service';
import { createUserSession } from '../../modules/sessions/session.repository';

import type { RequestLike, ResponseLike } from './auth.controller';

export async function loginHandler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const { email, password } = (req.body || {}) as { email?: string; password?: string };

    // Validate inputs
    const vEmail = validateEmail(email || '');
    if (!vEmail.valid) {
      res.status(400).json({ error: 'invalid_input', details: { email: vEmail.error } });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'invalid_input', details: { password: 'password.too_short' } });
      return;
    }

    const user = await findUserByEmail(vEmail.normalized!);
    // Generic error for wrong credentials
    if (!user) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    if (user.status === UserStatus.DISABLED || user.status === UserStatus.SUSPENDED) {
      res.status(403).json({ error: 'account_inactive' });
      return;
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    const access = signAccessToken({ id: user.id, email: user.email });
    const refresh = signRefreshToken({ id: user.id, email: user.email });

    // Persist refresh token hash and basic client info for session tracking
    try {
      const refreshHash = hashRefreshToken(refresh.token);
      const userAgent = (req as any).headers?.['user-agent'] || (req as any).headers?.['User-Agent'] || null;
      const ip = (req as any).ip || (req as any).ipAddress || (req as any).headers?.['x-forwarded-for'] || null;
      const decoded = decodeJwt(refresh.token) as any;
      const jti = decoded && decoded.jti ? String(decoded.jti) : null;
      await createUserSession({
        userId: user.id,
        refreshTokenHash: refreshHash,
        expiresAt: refresh.expiresAt,
        userAgent: typeof userAgent === 'string' ? userAgent : null,
        ipAddress: typeof ip === 'string' ? ip : null,
        jti,
      });
    } catch (_e) {
      // Do not fail login if session persistence fails; log in real app
    }

    res.status(200).json({
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
      tokenType: 'Bearer',
      user: { id: user.id, email: user.email, status: user.status },
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error' });
  }
}
