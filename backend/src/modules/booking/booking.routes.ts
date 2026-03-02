import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { cancelBookingController, createBookingController, getMapController } from './booking.controller';

const router = Router();

// GET /bookings/map?date=YYYY-MM-DD
router.get('/map', requireAuth, getMapController);

// POST /bookings
router.post('/', requireAuth, createBookingController);

// DELETE /bookings/:id (or PUT to cancel)
router.delete('/:id', requireAuth, cancelBookingController);
router.put('/:id/cancel', requireAuth, cancelBookingController);

export { router as bookingRouter };
