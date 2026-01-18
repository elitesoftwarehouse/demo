// Booking status mapping utilities for UI badges
// Source-of-truth: backend BookingState enum values
// Values: ATTIVA | PASSATA | CANCELLATA

export type BackendBookingState = 'ATTIVA' | 'PASSATA' | 'CANCELLATA' | string;

export type BadgeTone = 'success' | 'danger' | 'neutral';

export interface BadgeDef {
  i18nKey: string;
  tone: BadgeTone;
  icon: 'check-circle' | 'clock' | 'x-circle' | 'question-mark-circle';
}

export const BOOKING_BADGE_MAP: Record<string, BadgeDef> = {
  ATTIVA: { i18nKey: 'booking.state.ATTIVA', tone: 'success', icon: 'check-circle' },
  PASSATA: { i18nKey: 'booking.state.PASSATA', tone: 'neutral', icon: 'clock' },
  CANCELLATA: { i18nKey: 'booking.state.CANCELLATA', tone: 'danger', icon: 'x-circle' },
  UNKNOWN: { i18nKey: 'booking.state.UNKNOWN', tone: 'neutral', icon: 'question-mark-circle' },
};

export function mapBookingState(state: BackendBookingState): BadgeDef & { key: string } {
  const key = String(state || '').toUpperCase().trim();
  const def = BOOKING_BADGE_MAP[key] || BOOKING_BADGE_MAP.UNKNOWN;
  return { ...def, key: BOOKING_BADGE_MAP[key] ? key : 'UNKNOWN' };
}

export function toneClass(tone: BadgeTone): string {
  // Classnames designed to be mapped to your design system tokens
  // Example tokens (CSS not included here):
  //  .sd-badge--tone-success { --bg: var(--success-bg-subtle); --fg: var(--success-fg); --bd: var(--success-border); }
  //  .sd-badge--tone-danger  { --bg: var(--danger-bg-subtle);  --fg: var(--danger-fg);  --bd: var(--danger-border);  }
  //  .sd-badge--tone-neutral { --bg: var(--neutral-bg-subtle); --fg: var(--neutral-fg); --bd: var(--neutral-border); }
  return `sd-badge--tone-${tone}`;
}
