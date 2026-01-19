import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authRouter } from './modules/auth/auth.routes';
import { protectedRouter } from './modules/protected/protected.routes';
import { bookingRouter } from './modules/booking/booking.routes';

dotenv.config();

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Authorization'],
    })
  );
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));

  app.use('/auth', authRouter);
  app.use('/protected', protectedRouter);
  app.use('/bookings', bookingRouter);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error:', { status, message });
    }
    res.status(status).json({ error: message });
  });

  return app;
}
