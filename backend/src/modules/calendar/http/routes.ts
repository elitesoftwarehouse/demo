import { Router } from 'express';
import { CalendarController } from './CalendarController';

// Registers calendar routes under /api/calendar
export function registerCalendarRoutes(router: Router): Router {
  const ctrl = new CalendarController();

  router.get('/api/calendar/disabled-dates', ctrl.disabledDates);
  return router;
}
