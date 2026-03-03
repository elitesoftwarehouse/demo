import React from 'react';

// BookingStatusBadge — reusable UI component for booking status pills
// - Maps backend/domain status to user-friendly label and colors
// - Accessible: role="status", readable contrast
// - Handles unknown statuses with neutral style
// - Compatibility: supports legacy statuses (PENDING, CONFIRMED, CANCELLED)

export type DomainBookingState = 'PASSATA' | 'ATTIVA' | 'CANCELLATA';
export type LegacyBookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CANCELED';
export type AnyBookingStatus = DomainBookingState | LegacyBookingStatus | string | null | undefined;

export type BookingStatusBadgeProps = {
  status: AnyBookingStatus;
  // Optional: show a small icon before the label
  showIcon?: boolean;
  // Optional: override labels (i18n)
  labels?: Partial<Record<'PASSATA' | 'ATTIVA' | 'CANCELLATA' | 'PENDING' | 'UNKNOWN', string>>;
  // Optional: custom aria-label prefix
  ariaLabelPrefix?: string; // default: 'Stato prenotazione: '
  title?: string;
  className?: string;
  style?: React.CSSProperties;
};

export type NormalizedStatus = 'PASSATA' | 'ATTIVA' | 'CANCELLATA' | 'PENDING' | 'UNKNOWN';

function normalizeStatus(input: AnyBookingStatus): NormalizedStatus {
  if (!input) return 'UNKNOWN';
  const raw = String(input).trim().toUpperCase();
  if (raw === 'PASSATA') return 'PASSATA';
  if (raw === 'ATTIVA') return 'ATTIVA';
  if (raw === 'CANCELLATA') return 'CANCELLATA';
  if (raw === 'CANCELLED' || raw === 'CANCELED') return 'CANCELLATA';
  if (raw === 'CONFIRMED') return 'ATTIVA';
  if (raw === 'PENDING') return 'PENDING';
  return 'UNKNOWN';
}

function defaultLabel(s: NormalizedStatus): string {
  switch (s) {
    case 'PASSATA':
      return 'Passata';
    case 'ATTIVA':
      return 'Attiva';
    case 'CANCELLATA':
      return 'Cancellata';
    case 'PENDING':
      return 'In attesa';
    default:
      return 'Sconosciuto';
  }
}

function iconFor(s: NormalizedStatus): string {
  switch (s) {
    case 'ATTIVA':
      return '✓';
    case 'PASSATA':
      return '🕓';
    case 'CANCELLATA':
      return '✕';
    case 'PENDING':
      return '…';
    default:
      return '?';
  }
}

function styleFor(s: NormalizedStatus): { bg: string; fg: string; border?: string } {
  switch (s) {
    case 'ATTIVA':
      return { bg: '#10B981', fg: '#FFFFFF', border: '#059669' };
    case 'PASSATA':
      // Light gray background with dark text for strong readability on dimmed rows
      return { bg: '#E5E7EB', fg: '#111827', border: '#D1D5DB' };
    case 'CANCELLATA':
      return { bg: '#DC2626', fg: '#FFFFFF', border: '#B91C1C' };
    case 'PENDING':
      // Amber with dark text to ensure AA contrast
      return { bg: '#F59E0B', fg: '#111827', border: '#B45309' };
    default:
      return { bg: '#F3F4F6', fg: '#111827', border: '#E5E7EB' };
  }
}

export function mapBookingStatusToUi(input: AnyBookingStatus): { status: NormalizedStatus; label: string } {
  const s = normalizeStatus(input);
  return { status: s, label: defaultLabel(s) };
}

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: '16px',
  userSelect: 'none',
};

const iconStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: '12px',
};

const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({
  status,
  showIcon = false,
  labels,
  ariaLabelPrefix = 'Stato prenotazione: ',
  title,
  className,
  style,
}) => {
  const normalized = normalizeStatus(status);
  const text = (labels && labels[normalized as keyof typeof labels]) || defaultLabel(normalized);
  const palette = styleFor(normalized);

  const aria = `${ariaLabelPrefix}${text}`;

  return (
    <span
      role="status"
      aria-label={aria}
      title={title || text}
      className={className}
      style={{
        ...baseStyle,
        color: palette.fg,
        background: palette.bg,
        border: palette.border ? `1px solid ${palette.border}` : undefined,
        ...style,
      }}
    >
      {showIcon ? (
        <span aria-hidden="true" style={iconStyle}>
          {iconFor(normalized)}
        </span>
      ) : null}
      <span>{text}</span>
    </span>
  );
};

export default BookingStatusBadge;
