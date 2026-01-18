import React from 'react';
import { mapBookingState, toneClass, type BackendBookingState } from '../../lib/bookingStatus';
import './BookingStatusBadge.css';

export type BookingStatusBadgeProps = {
  state: BackendBookingState;
  size?: 'sm' | 'md';
  withIcon?: boolean;
  className?: string;
  // Optional direct label override (used rarely; otherwise i18n is used)
  label?: string;
  // Optional i18n t function injection; if not provided, falls back to plain label
  t?: (key: string, vars?: Record<string, any>) => string;
};

function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ');
}

function getSizeClass(size: 'sm' | 'md' = 'md') {
  return size === 'sm' ? 'sd-badge sd-badge--sm' : 'sd-badge sd-badge--md';
}

function Icon({ name }: { name: 'check-circle' | 'clock' | 'x-circle' | 'question-mark-circle' }) {
  // Minimal inline SVGs; replace with your icon system as needed
  const sz = 14;
  if (name === 'check-circle') {
    return (
      <svg width={sz} height={sz} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 14-4-4 1.4-1.4L11 12.2l5.6-5.6L18 8l-7 8Z" />
      </svg>
    );
  }
  if (name === 'clock') {
    return (
      <svg width={sz} height={sz} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 11h-4V7h2v4h2v2Z" />
      </svg>
    );
  }
  if (name === 'x-circle') {
    return (
      <svg width={sz} height={sz} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2.8 6.8L12 10.8l2.8-2.8L16.2 9.2 13.4 12l2.8 2.8-1.4 1.4L12 13.4l-2.8 2.8-1.4-1.4L10.6 12 7.8 9.2l1.4-1.4Z" />
      </svg>
    );
  }
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" />
    </svg>
  );
}

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({
  state,
  size = 'md',
  withIcon = true,
  className,
  label,
  t,
}) => {
  const def = mapBookingState(state);
  const translate = t || ((k: string) => k);
  const text = label ?? translate(def.i18nKey);
  const aria = translate('booking.badge.aria', { state: text }) || `Stato prenotazione: ${text}`;

  return (
    <span
      className={cx(getSizeClass(size), toneClass(def.tone), 'sd-badge--rounded', className)}
      aria-label={aria}
      title={aria}
      role="status"
    >
      {withIcon && <span className="sd-badge__icon" aria-hidden="true"><Icon name={def.icon} /></span>}
      <span className="sd-badge__text">{text}</span>
    </span>
  );
};

export default BookingStatusBadge;
