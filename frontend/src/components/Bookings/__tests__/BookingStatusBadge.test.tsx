/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookingStatusBadge } from '../BookingStatusBadge';
import { bookingStateColors } from '../statusMapper';

describe('BookingStatusBadge', () => {
  const t = (k: string) => ({
    'bookings.status.active': 'Attiva',
    'bookings.status.passed': 'Passata',
    'bookings.status.cancelled': 'Cancellata',
    'bookings.status.unknown': 'Sconosciuto',
  } as any)[k] || k;

  it('renders active state from raw value', () => {
    render(<BookingStatusBadge value="ACTIVE" i18n={t} />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-label', 'Attiva');
    expect(el).toHaveTextContent('Attiva');
    expect(el.getAttribute('data-state')).toBe('active');
  });

  it('renders passed state from raw value', () => {
    render(<BookingStatusBadge value="PASSATA" i18n={t} />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Passata');
  });

  it('renders cancelled state from raw value', () => {
    render(<BookingStatusBadge value="CANCELLATA" i18n={t} />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Cancellata');
  });

  it('falls back to unknown for unexpected values', () => {
    render(<BookingStatusBadge value="WHATEVER" i18n={t} />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Sconosciuto');
  });

  it('accepts normalized state directly', () => {
    render(<BookingStatusBadge state="active" i18n={t} />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Attiva');
  });

  it('applies correct colors for each known state', () => {
    const cases: Array<{ value: string; state: 'active' | 'passed' | 'cancelled' }> = [
      { value: 'ACTIVE', state: 'active' },
      { value: 'PASSATA', state: 'passed' },
      { value: 'CANCELLATA', state: 'cancelled' },
    ];

    cases.forEach(({ value, state }) => {
      const { unmount } = render(<BookingStatusBadge value={value} i18n={t} />);
      const el = screen.getByRole('status');
      const colors = bookingStateColors(state);
      expect(el).toHaveStyle(`background-color: ${colors.bg};`);
      expect(el).toHaveStyle(`color: ${colors.fg};`);
      if (colors.border) {
        expect(el).toHaveStyle(`border: 1px solid ${colors.border}`);
      }
      expect(el.getAttribute('data-state')).toBe(state);
      unmount();
    });
  });

  it('applies colors for unknown when value is null/undefined', () => {
    const { bg, fg } = bookingStateColors('unknown');

    const { unmount: u1 } = render(<BookingStatusBadge value={null} i18n={t} />);
    let el = screen.getByRole('status');
    expect(el).toHaveTextContent('Sconosciuto');
    expect(el).toHaveStyle(`background-color: ${bg};`);
    expect(el).toHaveStyle(`color: ${fg};`);
    u1();

    const { unmount: u2 } = render(<BookingStatusBadge value={undefined as any} i18n={t} />);
    el = screen.getByRole('status');
    expect(el).toHaveTextContent('Sconosciuto');
    expect(el).toHaveStyle(`background-color: ${bg};`);
    expect(el).toHaveStyle(`color: ${fg};`);
    u2();
  });

  it('uses i18n keys correctly (calls translator with expected keys)', () => {
    const tSpy = jest.fn((k: string) => k);

    render(<BookingStatusBadge value="ACTIVE" i18n={tSpy} />);
    expect(tSpy).toHaveBeenCalledWith('bookings.status.active');

    tSpy.mockClear();
    render(<BookingStatusBadge value="PASSATA" i18n={tSpy} />);
    expect(tSpy).toHaveBeenCalledWith('bookings.status.passed');

    tSpy.mockClear();
    render(<BookingStatusBadge value="CANCELLATA" i18n={tSpy} />);
    expect(tSpy).toHaveBeenCalledWith('bookings.status.cancelled');

    tSpy.mockClear();
    render(<BookingStatusBadge value="???" i18n={tSpy} />);
    expect(tSpy).toHaveBeenCalledWith('bookings.status.unknown');
  });

  it('falls back to default Italian labels when no i18n is provided', () => {
    // Known states
    const { unmount } = render(<BookingStatusBadge value="ACTIVE" />);
    let el = screen.getByRole('status');
    expect(el.textContent).toBe('Attiva');
    unmount();

    const r2 = render(<BookingStatusBadge value="PASSATA" />);
    el = screen.getByRole('status');
    expect(el.textContent).toBe('Passata');
    r2.unmount();

    const r3 = render(<BookingStatusBadge value="CANCELLATA" />);
    el = screen.getByRole('status');
    expect(el.textContent).toBe('Cancellata');
    r3.unmount();

    // Unknown -> uses default 'Sconosciuto'
    const r4 = render(<BookingStatusBadge value="???" />);
    el = screen.getByRole('status');
    expect(el.textContent).toBe('Sconosciuto');
    r4.unmount();
  });

  it('uses titleFallback only for unknown state when no i18n is provided', () => {
    const r1 = render(
      <BookingStatusBadge value="???" titleFallback="Non disponibile" />
    );
    let el = screen.getByRole('status');
    expect(el.textContent).toBe('Non disponibile');
    expect(el).toHaveAttribute('aria-label', 'Non disponibile');
    expect(el).toHaveAttribute('title', 'Non disponibile');
    r1.unmount();

    const r2 = render(
      <BookingStatusBadge value="ACTIVE" titleFallback="Ignorato per stati noti" />
    );
    el = screen.getByRole('status');
    expect(el.textContent).toBe('Attiva'); // unaffected for known states
    r2.unmount();
  });

  it('exposes accessibility attributes (role, aria-label, title)', () => {
    render(<BookingStatusBadge value="ACTIVE" i18n={t} />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-label', 'Attiva');
    expect(el).toHaveAttribute('title', 'Attiva');
  });

  it('applies custom className when provided', () => {
    render(<BookingStatusBadge value="ACTIVE" i18n={t} className="my-badge" />);
    const el = screen.getByRole('status');
    expect(el).toHaveClass('my-badge');
  });
});
