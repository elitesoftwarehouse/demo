// BookingController - HTTP layer to handle booking creation endpoint
import type { Request, Response } from 'express';
import type { IBookingRepository } from '../repository/BookingRepository';
import { BookingService } from '../service/BookingService';
import { HolidaysService } from '../service/HolidaysService';

export class BookingController {
  constructor(private readonly service: BookingService) {}

  static build(repo: IBookingRepository, holidays?: HolidaysService): BookingController {
    const svc = new BookingService(repo, holidays ?? new HolidaysService());
    return new BookingController(svc);
  }

  // POST /api/prenotazioni
  create = async (req: Request, res: Response) => {
    try {
      const payload = req.body || {};
      const data = await this.service.createBooking(payload);
      return res.status(201).json({ success: true, data });
    } catch (e: any) {
      const code = e?.code || 'INTERNAL_ERROR';
      const status = e?.httpStatus || (code === 'BAD_REQUEST' ? 400 : code === 'BOOKING_CONFLICT' ? 409 : 500);
      const safeMessage =
        code === 'COWORKING_CLOSED'
          ? 'Il coworking è chiuso in questa data'
          : code === 'BOOKING_CONFLICT'
          ? 'Esiste già una prenotazione in conflitto'
          : code === 'BAD_REQUEST'
          ? 'Input non valido'
          : 'Errore interno';
      return res.status(status).json({ success: false, error: { code, message: safeMessage, details: e?.details } });
    }
  };
}
