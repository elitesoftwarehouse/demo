import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
    tenantId?: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = header.substring('Bearer '.length);

  try {
    const payload = verifyAccessToken(token) as any;
    req.user = { id: payload.sub, role: payload.role, tenantId: payload.tenantId };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
