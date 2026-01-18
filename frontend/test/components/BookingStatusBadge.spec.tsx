import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BookingStatusBadge } from '../../src/components/bookings/BookingStatusBadge';

function t(key: string, vars?: Record<string, any>) {
  if (key === 'booking.badge.aria') return `Stato prenotazione: ${vars?.state}`;
  const map: Record<string, string> = {
    'booking.state.ATTIVA': 'Attiva',
    'booking.state.PASSATA': 'Passata',
    'booking.state.CANCELLATA': 'Cancellata',
    'booking.state.UNKNOWN': 'Sconosciuta',
  };
  return map[key] || key;
}

describe('BookingStatusBadge', () => {
  it('renders Active with success tone', () => {
    render(<BookingStatusBadge state="ATTIVA" t={t} />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Attiva');
    expect(el).toHaveAttribute('aria-label', expect.stringContaining('Attiva'));
    expect(el.className).toMatch(/sd-badge--tone-success/);
  });

  it('renders Past with neutral tone', () => {
    render(<BookingStatusBadge state="PASSATA" t={t} />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Passata');
    expect(el.className).toMatch(/sd-badge--tone-neutral/);
  });

  it('renders Cancelled with danger tone', () => {
    render(<BookingStatusBadge state="CANCELLATA" t={t} />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Cancellata');
    expect(el.className).toMatch(/sd-badge--tone-danger/);
  });

  it('falls back to UNKNOWN when state is unknown', () => {
    render(<BookingStatusBadge state="SOMETHING_ELSE" t={t} />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Sconosciuta');
    expect(el.className).toMatch(/sd-badge--tone-neutral/);
  });

  it('respects size props', () => {
    const { rerender } = render(<BookingStatusBadge state="ATTIVA" size="sm" t={t} />);
    expect(screen.getByRole('status').className).toMatch(/sd-badge--sm/);
    rerender(<BookingStatusBadge state="ATTIVA" size="md" t={t} />);
    expect(screen.getByRole('status').className).toMatch(/sd-badge--md/);
  });
});
