import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtVerifyKey, getJwtAlgorithm } from '../config/security';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = header.substring('Bearer '.length);
  try {
    const payload = jwt.verify(token, getJwtVerifyKey(), { algorithms: [getJwtAlgorithm()] }) as any;
    (req as any).user = { id: payload.sub, role: payload.role };
    return next();
  } catch (_e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const ok = roles.length === 0 || roles.includes(req.user.role || '');
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}
