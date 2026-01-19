import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true });
});

export { router as bookingsRouter };
