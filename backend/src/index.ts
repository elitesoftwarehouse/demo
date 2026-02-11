/**
 * Entry point placeholder for backend runtime.
 * This file exists to ensure TypeScript compilation succeeds when running tooling.
 * Real API setup (Express/Fastify) will be implemented in subsequent tasks.
 */
export * from './modules/users/user.model';
export * from './modules/users/user.repository';
export * from './security/password.service';
export * from './security/validation.service';
export * from './security/jwt.service';
export * from './api/auth';
export * from './db/client';
export * from './api/auth/jwt.middleware';
export * from './modules/sessions/session.repository';
export * from './api/profile/profile.controller';
export * from './modules/desks/desk.model';
export * from './modules/desks/desk.repository';
export * from './api/desks/desks.controller';
export * from './api/calendar/calendar.controller';
export * from './modules/bookings/booking.model';
export * from './modules/bookings/booking.repository';
export * from './api/bookings';
export * from './modules/calendar/closure.repository';
export * from './modules/calendar/closure.service';
export * from './modules/bookings/booking.cancellation.service';
