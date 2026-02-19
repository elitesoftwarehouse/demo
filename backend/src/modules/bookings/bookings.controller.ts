import { Request, Response } from 'express';
import { z } from 'zod';
import { bookingsService, BusinessError } from './bookings.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const mapQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const createSchema = z.object({
  deskId: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

export async function getMapController(req: AuthenticatedRequest, res: Response) {
  const parse = mapQuerySchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ error: 'INVALID_QUERY', details: parse.error.flatten() });
  }
  try {
    const data = await bookingsService.getMap(parse.data.date, req.user?.id);
    return res.status(200).json({ date: parse.data.date, desks: data });
  } catch (e: any) {
    if (e instanceof BusinessError) {
      const mapped = mapBusinessError(e);
      return res.status(mapped.status).json(mapped.body);
    }
    console.error('getMap error', e?.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function createBookingController(req: AuthenticatedRequest, res: Response) {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'INVALID_BODY', details: parse.error.flatten() });
  }
  try {
    const created = await bookingsService.create(req.user!.id, parse.data);
    return res.status(201).json(created);
  } catch (e: any) {
    if (e instanceof BusinessError) {
      const mapped = mapBusinessError(e);
      return res.status(mapped.status).json(mapped.body);
    }
    console.error('createBooking error', e?.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function cancelBookingController(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const parse = cancelSchema.safeParse(req.body || {});
  if (!id) return res.status(400).json({ error: 'MISSING_ID' });
  if (!parse.success) {
    return res.status(400).json({ error: 'INVALID_BODY', details: parse.error.flatten() });
  }
  try {
    const cancelled = await bookingsService.cancel(req.user!.id, id, parse.data.reason);
    return res.status(200).json(cancelled);
  } catch (e: any) {
    if (e instanceof BusinessError) {
      const mapped = mapBusinessError(e);
      return res.status(mapped.status).json(mapped.body);
    }
    console.error('cancelBooking error', e?.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
