import { Router } from 'express';
import type { IBookingRepository } from '../repository/BookingRepository';
import { BookingController } from './BookingController';

// Registers booking routes under /api/prenotazioni
export function registerBookingRoutes(router: Router, repo: IBookingRepository): Router {
  const ctrl = BookingController.build(repo);
  router.post('/api/prenotazioni', ctrl.create);
  return router;
}
