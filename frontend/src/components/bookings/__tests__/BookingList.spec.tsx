import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BookingList, BookingItem } from '../BookingList';

function sampleItems(): BookingItem[] {
  return [
    { id: '3', start: '2026-01-10T10:00:00Z', end: '2026-01-10T11:00:00Z', title: 'B3', location: 'Sede A', status: 'CONFIRMED' },
    { id: '1', start: '2026-01-05T09:00:00Z', end: '2026-01-05T10:00:00Z', title: 'B1', location: 'Sede B', status: 'CONFIRMED' },
    { id: '2', start: '2026-01-07T12:00:00Z', end: '2026-01-07T13:00:00Z', title: 'B2', location: 'Sede C', status: 'CANCELLED' },
  ];
}

describe('BookingList component', () => {
  it('renders loading state', () => {
    render(<BookingList items={[]} loading />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<BookingList items={[]} error="Boom" />);
    expect(screen.getByTestId('error')).toHaveTextContent('Errore: Boom');
  });

  it('renders empty state', () => {
    render(<BookingList items={[]} loading={false} />);
    expect(screen.getByTestId('empty-state')).toHaveTextContent('Nessuna prenotazione');
  });

  it('renders items sorted by start datetime ascending and shows key info', () => {
    render(<BookingList items={sampleItems()} loading={false} />);

    const rows = screen.getAllByTestId('booking-row');
    expect(rows.length).toBe(3);

    // Expect order by ascending start: id 1, 2, 3
    expect(rows[0]).toHaveTextContent('B1');
    expect(rows[1]).toHaveTextContent('B2');
    expect(rows[2]).toHaveTextContent('B3');

    // Check date/time label exists and location/status are present
    expect(screen.getAllByTestId('booking-date')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('booking-location')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('booking-status')[0]).toBeInTheDocument();
  });

  it('is responsive across mobile and desktop widths (content still visible)', () => {
    const originalWidth = window.innerWidth;

    // Mobile
    // @ts-ignore
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    render(<BookingList items={sampleItems()} loading={false} />);
    expect(screen.getByTestId('my-bookings-list')).toBeInTheDocument();
    cleanup();

    // Desktop
    // @ts-ignore
    window.innerWidth = 1280;
    window.dispatchEvent(new Event('resize'));
    render(<BookingList items={sampleItems()} loading={false} />);
    expect(screen.getAllByTestId('booking-row').length).toBe(3);

    // Restore
    // @ts-ignore
    window.innerWidth = originalWidth;
  });
});
