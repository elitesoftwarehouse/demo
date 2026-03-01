import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookingStatusBadge } from '../BookingStatusBadge';

function getBadge() {
  return screen.getByRole('status');
}

describe('BookingStatusBadge - rendering and classes', () => {
  it('renders ATTIVA with Italian label and classes', () => {
    render(<BookingStatusBadge state="ATTIVA" locale="it" />);
    const badge = getBadge();
    expect(badge).toBeInTheDocument?.();
    expect(badge.textContent).toContain('Attiva');
    expect(badge.className).toContain('badge');
    expect(badge.className).toContain('badge--sm');
    expect(badge.className).toContain('badge--attiva');
  });

  it('renders PASSATA with Italian label and classes', () => {
    render(<BookingStatusBadge state="PASSATA" locale="it" />);
    const badge = getBadge();
    expect(badge.textContent).toContain('Passata');
    expect(badge.className).toContain('badge--passata');
  });

  it('renders CANCELLATA with Italian label and classes', () => {
    render(<BookingStatusBadge state="CANCELLATA" locale="it" />);
    const badge = getBadge();
    expect(badge.textContent).toContain('Cancellata');
    expect(badge.className).toContain('badge--cancellata');
  });

  it('accepts legacy/english values and normalizes to ATTIVA', () => {
    render(<BookingStatusBadge state="confirmed" locale="en" />);
    const badge = getBadge();
    expect(badge.textContent).toContain('Active');
    expect(badge.className).toContain('badge--attiva');
  });

  it('applies size md when requested', () => {
    render(<BookingStatusBadge state="ATTIVA" size="md" />);
    const badge = getBadge();
    expect(badge.className).toContain('badge--md');
  });
});

describe('BookingStatusBadge - unknown/null state', () => {
  it('renders neutral badge when state is unknown string', () => {
    render(<BookingStatusBadge state="foo" locale="it" />);
    const badge = getBadge();
    expect(badge.className).toContain('badge--neutral');
    expect(badge.textContent).toContain('Sconosciuta');
  });

  it('renders neutral badge when state is null', () => {
    render(<BookingStatusBadge state={null} locale="en" />);
    const badge = getBadge();
    expect(badge.className).toContain('badge--neutral');
    expect(badge.textContent).toContain('Unknown');
  });
});

describe('BookingStatusBadge - locale/i18n behaviour', () => {
  it('uses Italian labels when locale="it"', () => {
    render(<BookingStatusBadge state="PASSATA" locale="it" />);
    expect(getBadge().textContent).toContain('Passata');
  });

  it('uses English labels when locale="en"', () => {
    render(<BookingStatusBadge state="PASSATA" locale="en" />);
    expect(getBadge().textContent).toContain('Past');
  });
});

describe('BookingStatusBadge - accessibility', () => {
  it('provides role="status" and an aria-label with localized prefix and label (it)', () => {
    render(<BookingStatusBadge state="CANCELLATA" locale="it" />);
    const badge = getBadge();
    expect(badge.getAttribute('role')).toBe('status');
    const aria = badge.getAttribute('aria-label') || '';
    expect(aria).toContain('Stato prenotazione');
    expect(aria).toContain('Cancellata');
  });

  it('provides aria-label in English when locale="en"', () => {
    render(<BookingStatusBadge state="ATTIVA" locale="en" />);
    const aria = getBadge().getAttribute('aria-label') || '';
    expect(aria).toContain('Booking status');
    expect(aria).toContain('Active');
  });

  it('marks the icon as aria-hidden when shown', () => {
    render(<BookingStatusBadge state="ATTIVA" showIcon />);
    const icon = getBadge().querySelector('span[aria-hidden]');
    expect(icon).not.toBeNull();
  });

  it('can hide the icon when showIcon=false', () => {
    render(<BookingStatusBadge state="ATTIVA" showIcon={false} />);
    const icon = getBadge().querySelector('span[aria-hidden]');
    expect(icon).toBeNull();
  });

  it('uses custom title when provided', () => {
    render(<BookingStatusBadge state="PASSATA" title="Custom title" />);
    const badge = getBadge();
    expect(badge.getAttribute('title')).toBe('Custom title');
  });

  it('falls back to aria label when title is not provided', () => {
    render(<BookingStatusBadge state="PASSATA" locale="it" />);
    const badge = getBadge();
    expect(badge.getAttribute('title')).toBe(badge.getAttribute('aria-label'));
  });
});
