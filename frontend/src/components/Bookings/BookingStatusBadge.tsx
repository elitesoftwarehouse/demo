import React from 'react';
import { bookingStateColors, bookingStateLabelKey, normalizeBookingState, type UiBookingState } from './statusMapper';

export type BookingStatusBadgeProps = {
  value?: string | null; // raw backend value (e.g., PASSATA, ATTIVA, CANCELLATA)
  state?: UiBookingState; // alternatively pass normalized state directly
  i18n?: (key: string) => string; // optional translator
  titleFallback?: string; // optional fallback for title/aria when no i18n
  className?: string; // allow custom class override/extension
  size?: 'sm' | 'md'; // badge size variant
};

function useLabel(state: UiBookingState, i18n?: (k: string) => string, titleFallback?: string): string {
  const key = bookingStateLabelKey(state);
  if (i18n) return i18n(key);
  // Fallback human labels in Italian as per story
  switch (state) {
    case 'active':
      return 'Attiva';
    case 'passed':
      return 'Passata';
    case 'cancelled':
      return 'Cancellata';
    default:
      return titleFallback || 'Sconosciuto';
  }
}

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ value, state: forcedState, i18n, titleFallback, className, size = 'sm' }) => {
  const state = forcedState || normalizeBookingState(value);
  const label = useLabel(state, i18n, titleFallback);
  const colors = bookingStateColors(state);

  const padding = size === 'md' ? '4px 10px' : '2px 8px';
  const fontSize = size === 'md' ? '0.875rem' : '0.75rem';
  const radius = '9999px'; // pill shape
  const style: React.CSSProperties = {
    display: 'inline-block',
    padding,
    fontSize,
    lineHeight: 1.2,
    borderRadius: radius,
    backgroundColor: colors.bg,
    color: colors.fg,
    fontWeight: 600,
    border: colors.border ? `1px solid ${colors.border}` : undefined,
  };

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      style={style}
      className={className}
      data-state={state}
    >
      {label}
    </span>
  );
};
