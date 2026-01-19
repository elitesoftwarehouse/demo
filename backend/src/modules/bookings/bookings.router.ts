import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  getMapController,
  createBookingController,
  cancelBookingController,
} from './bookings.controller';

const router = Router();

// Existing test endpoint
router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true });
});

// New endpoints for booking domain
// GET /bookings/map?date=YYYY-MM-DD
router.get('/map', requireAuth, getMapController);

// POST /bookings { deskId, date }
router.post('/', requireAuth, createBookingController);

// DELETE /bookings/:id { reason? }
router.delete('/:id', requireAuth, cancelBookingController);

export { router as bookingsRouter };
