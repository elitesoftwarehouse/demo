import { canUserCancel } from './BookingCancellationPolicy';
import { Booking, CancellationSource } from '../entities/Booking';
import { BookingStatusService } from './BookingStatusService';

export type CancelResult = {
  updated: Booking;
};

export type CancelBookingInput = {
  booking: Booking;
  authUserId: string; // authenticated user attempting cancellation
  now?: Date;
  tz?: string; // default 'Europe/Rome'
  reason?: string | null;
};

export class BookingCancellationService {
  static cancelBooking(input: CancelBookingInput): CancelResult {
    const { booking, authUserId } = input;
    if (!booking || !authUserId) throw new Error('invalid_input');

    // Ownership check
    if (booking.userId !== authUserId) {
      const err = new Error('forbidden');
      (err as any).code = 'forbidden';
      throw err;
    }

    const now = input.now ?? new Date();
    const tz = input.tz || 'Europe/Rome';

    // Already cancelled check
    if (booking.cancelledAt) {
      const err = new Error('already_cancelled');
      (err as any).code = 'already_cancelled';
      throw err;
    }

    const policy = canUserCancel({ date: booking.date, startAt: booking.startAt || undefined, cancelledAt: booking.cancelledAt || undefined, now, tz });
    if (!policy.allowed) {
      const err = new Error(policy.reason || 'not_allowed');
      (err as any).code = policy.reason || 'not_allowed';
      throw err;
    }

    const cancelledAt = now.toISOString();
    const cancellationSource: CancellationSource = 'USER';

    const updated: Booking = {
      ...booking,
      cancelledAt,
      cancelledByUserId: authUserId,
      cancellationSource,
      cancellationReason: input.reason ?? null,
      status: BookingStatusService.computeStatus({ date: booking.date, cancelledAt, cancellationSource, now, tz }),
      updatedAt: now.toISOString(),
    };

    return { updated };
  }
}
