import { Request, Response } from 'express';
import { z } from 'zod';
import { bookingService, BusinessError } from './booking.service';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const mapQuerySchema = z.object({
  date: z.string().regex(dateRegex, 'Formato data non valido (YYYY-MM-DD)'),
});

const createSchema = z.object({
  deskId: z.number().int().min(1),
  date: z.string().regex(dateRegex, 'Formato data non valido (YYYY-MM-DD)'),
});

const cancelSchema = z.object({
  reason: z.string().max(200).optional(),
});

export async function getMapController(req: Request, res: Response) {
  const parsed = mapQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { date } = parsed.data as any;
  const map = await bookingService.getMap(date);
  const requesterId = req.user?.id;
  const isAdmin = (req.user?.role || '') === 'ADMIN';
  const sanitized = map.map((d: any) => {
    const mine = requesterId && d.userId === requesterId;
    return {
      id: d.id,
      code: d.code,
      label: d.label,
      row: d.row,
      col: d.col,
      active: d.active,
      occupied: d.occupied,
      myBooking: !!mine,
      // expose bookingId only if it's mine or requester is admin
      bookingId: mine || isAdmin ? d.bookingId : undefined,
    };
  });
  return res.json({ date, desks: sanitized });
}

export async function createBookingController(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const { deskId, date } = parsed.data;
    const userId = req.user?.id as string;
    const created = await bookingService.createBooking({ userId, deskId, date });
    return res.status(201).json(created);
  } catch (err: any) {
    if (err instanceof BusinessError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Errore interno' });
  }
}

export async function cancelBookingController(req: Request, res: Response) {
  const parsed = cancelSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const bookingId = req.params.id;
    const userId = req.user?.id as string;
    const reason = parsed.data.reason;
    const cancelled = await bookingService.cancelBooking({ bookingId, userId, reason });
    return res.status(200).json(cancelled);
  } catch (err: any) {
    if (err instanceof BusinessError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Errore interno' });
  }
}
