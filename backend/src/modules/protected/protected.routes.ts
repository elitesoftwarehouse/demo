import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ me: user });
});

export { router as protectedRouter };
