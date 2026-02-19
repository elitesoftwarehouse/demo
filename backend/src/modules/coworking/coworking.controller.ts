import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { bookingsService, BusinessError } from '../bookings/bookings.service';
import { bookingRepository } from '../bookings/booking.repository';

const mapQuerySchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const createSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  postazioneId: z.number().int().min(1),
});

const cancelSchema = z.object({
  reason: z.string().max(200).optional(),
});

function mapBusinessError(err: BusinessError): { status: number; body: any } {
  switch (err.code) {
    case 'DATE_INVALID':
      return { status: 400, body: { error: err.code, message: err.message } };
    case 'NON_WORKING_DAY':
      return { status: 422, body: { error: err.code, message: err.message } };
    case 'DESK_NOT_FOUND':
      return { status: 404, body: { error: err.code, message: err.message } };
    case 'DESK_INACTIVE':
      return { status: 409, body: { error: err.code, message: err.message } };
    case 'USER_ALREADY_BOOKED':
    case 'DESK_ALREADY_BOOKED':
    case 'CANCELLATION_WINDOW_PASSED':
      return { status: 409, body: { error: err.code, message: err.message } };
    case 'FORBIDDEN':
      return { status: 403, body: { error: err.code, message: err.message } };
    case 'NOT_FOUND':
      return { status: 404, body: { error: err.code, message: err.message } };
    default:
      return { status: 400, body: { error: err.code || 'BUSINESS_ERROR', message: err.message } };
  }
}

export async function getPostazioniController(req: AuthenticatedRequest, res: Response) {
  const parse = mapQuerySchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ error: 'INVALID_QUERY', details: parse.error.flatten() });
  }
  const date = parse.data.data;
  try {
    const map = await bookingsService.getMap(date, req.user?.id);

    // Find user's booking id (if any) for that date to populate idPrenotazioneUtente
    const myBooking = req.user?.id
      ? await bookingRepository.findUserBookingOnDate(req.user.id, date)
      : null;

    const postazioni = map.map((item) => {
      const prenotataDaMe = Boolean(item.occupant?.isMe);
      return {
        id: item.desk.id,
        label: item.desk.code,
        row: item.desk.row,
        col: item.desk.col,
        stato: item.status === 'OCCUPIED' ? 'OCCUPATA' : 'LIBERA',
        prenotataDaMe,
        idPrenotazioneUtente:
          prenotataDaMe && myBooking && myBooking.deskId === item.desk.id ? myBooking.id : undefined,
      };
    });

    return res.status(200).json({ data: date, postazioni });
  } catch (e: any) {
    if (e instanceof BusinessError) {
      console.warn('audit:rule_violation', {
        endpoint: 'GET /coworking/postazioni',
        userId: req.user?.id,
        code: e.code,
        message: e.message,
      });
      const mapped = mapBusinessError(e);
      return res.status(mapped.status).json(mapped.body);
    }
    console.error('getPostazioni error', e?.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function createPrenotazioneController(req: AuthenticatedRequest, res: Response) {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'INVALID_BODY', details: parse.error.flatten() });
  }
  try {
    const created = await bookingsService.create(req.user!.id, {
      deskId: parse.data.postazioneId,
      date: parse.data.data,
    });
    console.log('audit:booking_create', {
      endpoint: 'POST /coworking/prenotazioni',
      userId: req.user?.id,
      deskId: parse.data.postazioneId,
      date: parse.data.data,
      bookingId: created.id,
    });
    return res.status(201).json(created);
  } catch (e: any) {
    if (e instanceof BusinessError) {
      console.warn('audit:rule_violation', {
        endpoint: 'POST /coworking/prenotazioni',
        userId: req.user?.id,
        code: e.code,
        message: e.message,
      });
      const mapped = mapBusinessError(e);
      return res.status(mapped.status).json(mapped.body);
    }
    console.error('createPrenotazione error', e?.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function cancellaPrenotazioneController(
  req: AuthenticatedRequest,
  res: Response
) {
  const { id } = req.params as { id: string };
  const parse = cancelSchema.safeParse(req.body || {});
  if (!id) return res.status(400).json({ error: 'MISSING_ID' });
  if (!parse.success) {
    return res.status(400).json({ error: 'INVALID_BODY', details: parse.error.flatten() });
  }
  try {
    const cancelled = await bookingsService.cancel(req.user!.id, id, parse.data.reason);
    console.log('audit:booking_cancel', {
      endpoint: 'DELETE /coworking/prenotazioni/:id',
      userId: req.user?.id,
      bookingId: id,
      reason: parse.data.reason,
    });
    return res.status(200).json(cancelled);
  } catch (e: any) {
    if (e instanceof BusinessError) {
      console.warn('audit:rule_violation', {
        endpoint: 'DELETE /coworking/prenotazioni/:id',
        userId: req.user?.id,
        code: e.code,
        message: e.message,
      });
      const mapped = mapBusinessError(e);
      return res.status(mapped.status).json(mapped.body);
    }
    console.error('cancellaPrenotazione error', e?.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
