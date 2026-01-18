// BookingService - front-end contract and implementations for desk booking
// If backend API exists, ApiBookingService will call it.
// Otherwise use MockBookingService to simulate booking behavior for UI/testing.

export type BookingStatus = 'CONFIRMED' | 'REJECTED';

export interface CreateDeskBookingRequest {
  deskId: string;
  // ISO date string (yyyy-mm-dd) or full ISO; backend usually expects date-only
  dateISO: string;
  // Optional: if backend requires explicit userId (often it's inferred from JWT)
  userId?: string;
}

export interface CreateDeskBookingResponse {
  bookingId: string;
  deskId: string;
  dateISO: string;
  userId?: string;
  status: BookingStatus;
  message?: string;
}

export class BookingError extends Error {
  code: string;
  status?: number;
  constructor(message: string, code: string = 'BOOKING_ERROR', status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface IBookingService {
  createDeskBooking(req: CreateDeskBookingRequest): Promise<CreateDeskBookingResponse>;
}

// Real API implementation (if backend endpoint is available)
export class ApiBookingService implements IBookingService {
  constructor(private readonly baseUrl: string = '') {}

  async createDeskBooking(req: CreateDeskBookingRequest): Promise<CreateDeskBookingResponse> {
    const url = `${this.baseUrl}/api/desks/${encodeURIComponent(req.deskId)}/book`;
    const body: any = { date: req.dateISO };
    if (req.userId) body.userId = req.userId; // only if backend requires it

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include', // send cookies/JWT if applicable
        body: JSON.stringify(body),
      });
    } catch (e: any) {
      throw new BookingError('Problema di rete durante la prenotazione', 'NETWORK_ERROR');
    }

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json().catch(() => ({})) : {};

    if (!res.ok) {
      // Map some common backend errors
      if (res.status === 409) {
        throw new BookingError(
          payload?.error?.message || 'La postazione è appena stata prenotata da un altro utente',
          'CONFLICT',
          res.status
        );
      }
      if (res.status === 400) {
        throw new BookingError(payload?.error?.message || 'Dati non validi', 'BAD_REQUEST', res.status);
      }
      if (res.status === 401 || res.status === 403) {
        throw new BookingError('Non autorizzato. Effettua il login per prenotare.', 'UNAUTHORIZED', res.status);
      }
      throw new BookingError(payload?.error?.message || 'Errore durante la prenotazione', 'BOOKING_ERROR', res.status);
    }

    // Expected response shape (example): { success: true, data: { id, deskId, date, userId, status } }
    const data = payload?.data || payload;
    return {
      bookingId: data?.id || data?.bookingId || '',
      deskId: data?.deskId ?? req.deskId,
      dateISO: data?.date || req.dateISO,
      userId: data?.userId,
      status: (data?.status as BookingStatus) || 'CONFIRMED',
      message: data?.message,
    };
  }
}

// Mock implementation to simulate bookings in UI without backend
export class MockBookingService implements IBookingService {
  private bookings = new Map<string, CreateDeskBookingResponse>();
  private latencyMs: number;

  constructor(opts?: { latencyMs?: number }) {
    this.latencyMs = opts?.latencyMs ?? 600;
  }

  async createDeskBooking(req: CreateDeskBookingRequest): Promise<CreateDeskBookingResponse> {
    await delay(this.latencyMs);

    // Simulate occasional network error
    if (Math.random() < 0.05) {
      throw new BookingError('Errore di rete simulato', 'NETWORK_ERROR');
    }

    const key = `${req.dateISO}::${req.deskId}`;
    if (this.bookings.has(key)) {
      throw new BookingError('Postazione già prenotata', 'CONFLICT');
    }

    const resp: CreateDeskBookingResponse = {
      bookingId: randomId(),
      deskId: req.deskId,
      dateISO: req.dateISO,
      userId: req.userId,
      status: 'CONFIRMED',
      message: 'Prenotazione confermata (simulata)',
    };
    this.bookings.set(key, resp);
    return resp;
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID();
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { randomBytes } = require('crypto');
    return randomBytes(16).toString('hex');
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
