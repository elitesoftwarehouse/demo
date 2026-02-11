/**
 * Booking cancellation policy service
 */

export interface CancellationPolicyConfig {
  // When booking.startAt is not present, compute start as booking.date at this time (UTC)
  defaultStartHourUtc?: number; // 0..23 (default: 9)
  defaultStartMinuteUtc?: number; // 0..59 (default: 0)
  cutoffHours?: number; // hours threshold (default: 24)
}

export interface CancellationDecision {
  allowed: boolean;
  reason?: string; // i18n key or human message
  hoursBeforeStart?: number; // informational
  startAt: Date; // computed or provided start datetime (UTC)
  now: Date;
}

const DEFAULTS: Required<CancellationPolicyConfig> = {
  defaultStartHourUtc: 9,
  defaultStartMinuteUtc: 0,
  cutoffHours: 24,
};

function envInt(name: string, fallback: number): number {
  const v = process.env && process.env[name];
  if (!v) return fallback;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function getCancellationPolicyFromEnv(): Required<CancellationPolicyConfig> {
  return {
    defaultStartHourUtc: envInt('BOOKING_START_HOUR_UTC', DEFAULTS.defaultStartHourUtc),
    defaultStartMinuteUtc: envInt('BOOKING_START_MINUTE_UTC', DEFAULTS.defaultStartMinuteUtc),
    cutoffHours: envInt('BOOKING_CANCEL_CUTOFF_HOURS', DEFAULTS.cutoffHours),
  } as Required<CancellationPolicyConfig>;
}

export function computeStartAt(date: Date, cfg: Required<CancellationPolicyConfig>): Date {
  const iso = date.toISOString().slice(0, 10);
  return new Date(`${iso}T${String(cfg.defaultStartHourUtc).padStart(2, '0')}:${String(
    cfg.defaultStartMinuteUtc,
  ).padStart(2, '0')}:00.000Z`);
}

export function canUserCancelBooking(
  booking: { date: Date; startAt?: Date | null },
  config?: CancellationPolicyConfig,
  now?: Date,
): CancellationDecision {
  const cfg = { ...DEFAULTS, ...(config || {}) } as Required<CancellationPolicyConfig>;
  const current = now ?? new Date();
  const start = booking.startAt ?? computeStartAt(booking.date, cfg);
  const diffMs = start.getTime() - current.getTime();
  const hours = diffMs / (1000 * 60 * 60);

  // Business rule: allowed only when strictly more than cutoff hours remain
  if (hours > cfg.cutoffHours) {
    return { allowed: true, startAt: start, now: current, hoursBeforeStart: hours };
  }
  return {
    allowed: false,
    reason: 'CUTOFF_24H_NOT_MET',
    startAt: start,
    now: current,
    hoursBeforeStart: hours,
  };
}

// Convenience wrapper used by controllers
export function decideCancellation(
  booking: { date: Date; startAt?: Date | null },
  now?: Date,
  config?: CancellationPolicyConfig,
): CancellationDecision {
  return canUserCancelBooking(booking, config, now);
}
