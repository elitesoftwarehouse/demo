import React from 'react';
import '../../../assets/styles/badges.css';
import { normalizeBookingState, type BookingUiState } from '../utils/statusMapper';

export type BadgeLocale = 'it' | 'en';
export type BadgeVariant = 'solid' | 'neutral';
export type BadgeSize = 'sm' | 'md';

const BADGE_LABELS: Record<BookingUiState, Record<BadgeLocale, string>> = {
  ATTIVA: { it: 'Attiva', en: 'Active' },
  PASSATA: { it: 'Passata', en: 'Past' },
  CANCELLATA: { it: 'Cancellata', en: 'Cancelled' },
};

function labelFor(state: BookingUiState | null, locale: BadgeLocale): string {
  if (!state) return locale === 'en' ? 'Unknown' : 'Sconosciuta';
  return BADGE_LABELS[state][locale] || BADGE_LABELS[state].it;
}

function iconFor(state: BookingUiState | null): string {
  if (state === 'ATTIVA') return '✓';
  if (state === 'PASSATA') return '🕓';
  if (state === 'CANCELLATA') return '✕';
  return '•';
}

export type BookingStatusBadgeProps = {
  state: string | null | undefined; // backend/raw value
  locale?: BadgeLocale;
  size?: BadgeSize;
  showIcon?: boolean;
  className?: string;
  title?: string; // optional custom title tooltip
};

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({
  state,
  locale = 'it',
  size = 'sm',
  showIcon = true,
  className,
  title,
}) => {
  const normalized = normalizeBookingState(state);
  const label = labelFor(normalized, locale);

  let cls = 'badge';
  cls += size === 'md' ? ' badge--md' : ' badge--sm';
  if (normalized === 'ATTIVA') cls += ' badge--attiva';
  else if (normalized === 'PASSATA') cls += ' badge--passata';
  else if (normalized === 'CANCELLATA') cls += ' badge--cancellata';
  else cls += ' badge--neutral';
  if (className) cls += ` ${className}`;

  const aria = `${locale === 'en' ? 'Booking status' : 'Stato prenotazione'}: ${label}`;
  const tooltip = title || aria;

  return (
    <span className={cls} aria-label={aria} title={tooltip} role="status">
      {showIcon && <span aria-hidden>{iconFor(normalized)}</span>}
      <span>{label}</span>
    </span>
  );
};

export default BookingStatusBadge;
