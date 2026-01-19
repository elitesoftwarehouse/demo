import { bookingRepository, toDateKey } from './booking.repository';
import { deskRepository } from '../desk/desk.repository';

export class BusinessError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

function isWeekday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d); // local date
  const day = dt.getDay(); // 0 Sun .. 6 Sat
  return day >= 1 && day <= 5;
}

function moreThan24hBefore(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10));
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const now = Date.now();
  return start - now > 24 * 60 * 60 * 1000;
}

class BookingService {
  async getMap(dateInput: string) {
    const date = toDateKey(dateInput);
    const desks = await deskRepository.listAll();
    const bookings = await bookingRepository.listByDate(date);
    const byDesk = new Map<number, any>();
    bookings.forEach((b) => byDesk.set(b.deskId, b));

    return desks.map((d) => {
      const b = byDesk.get(d.id);
      return {
        id: d.id,
        code: d.code,
        label: d.label,
        row: d.row,
        col: d.col,
        active: d.active,
        occupied: !!b,
        bookingId: b?.id,
        userId: b?.userId,
      };
    });
  }

  async createBooking(params: { userId: string; deskId: number; date: string }) {
    const date = toDateKey(params.date);
    if (!isWeekday(date)) {
      throw new BusinessError(400, 'Le prenotazioni sono consentite solo nei giorni feriali');
    }

    const desk = await deskRepository.findById(params.deskId);
    if (!desk || !desk.active) {
      throw new BusinessError(404, 'Postazione non disponibile');
    }

    const existingByUser = await bookingRepository.findByUserAndDate(params.userId, date);
    if (existingByUser) {
      throw new BusinessError(409, 'Hai già una prenotazione per questa data');
    }

    const existingByDesk = await bookingRepository.findByDeskAndDate(params.deskId, date);
    if (existingByDesk) {
      throw new BusinessError(409, 'La postazione è già prenotata per questa data');
    }

    const created = await bookingRepository.create({ userId: params.userId, deskId: params.deskId, date });
    return created;
  }

  async cancelBooking(params: { bookingId: string; userId: string; reason?: string }) {
    const b = await bookingRepository.findById(params.bookingId);
    if (!b || b.status !== 'ACTIVE') {
      throw new BusinessError(404, 'Prenotazione non trovata');
    }
    if (b.userId !== params.userId) {
      throw new BusinessError(403, 'Non puoi cancellare prenotazioni di altri utenti');
    }
    if (!moreThan24hBefore(b.date)) {
      throw new BusinessError(400, 'Puoi cancellare solo fino a 24 ore prima');
    }
    const cancelled = await bookingRepository.cancel(b.id, params.reason);
    return cancelled;
  }
}

export const bookingService = new BookingService();
