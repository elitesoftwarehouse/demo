/* @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyBookingsPage } from '../MyBookingsPage';
import type { UserBookingItemDto } from '../../../api/bookingsClient';

// declare jest for TS without types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

function mockFetchOnce(status: number, body: any) {
  (global as any).fetch = jest.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function makeItem(id: string, startDate: string, extras?: Partial<UserBookingItemDto>): UserBookingItemDto {
  return {
    id,
    startDate,
    endDate: null,
    deskId: `D-${id}`,
    status: 'confirmed',
    ...extras,
  } as UserBookingItemDto;
}

describe('MyBookingsPage - unit/component', () => {
  const baseProps = { baseUrl: '/api' };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-15T10:00:00Z'));
  });

  afterEach(() => {
    (global as any).fetch = undefined;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders non-empty list and matches API data order (nearest first)', async () => {
    const items: UserBookingItemDto[] = [
      makeItem('3', '2026-02-01T08:00:00Z'),
      makeItem('1', '2026-01-16T09:00:00Z'),
      makeItem('2', '2026-01-20T09:00:00Z'),
    ];
    mockFetchOnce(200, { items, page: 1, size: 20, hasMore: false });

    render(<MyBookingsPage {...baseProps} />);

    // loading state visible
    expect(screen.getByText(/caricamento/i)).toBeInTheDocument();

    // Wait for list
    const rows = await screen.findAllByTestId('booking-row');
    expect(rows).toHaveLength(3);

    // Verify order by nearest first -> 16 Jan, 20 Jan, 1 Feb
    const dates = rows.map((r) => r.getAttribute('data-start') || '');
    expect(dates).toEqual([
      '2026-01-16T09:00:00.000Z',
      '2026-01-20T09:00:00.000Z',
      '2026-02-01T08:00:00.000Z',
    ]);

    // Check key information present
    expect(screen.getAllByText(/Postazione:/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Stato:/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Data\/ora:/i)[0]).toBeInTheDocument();
  });

  it('renders empty state message when no bookings', async () => {
    mockFetchOnce(200, { items: [], page: 1, size: 20, hasMore: false });
    render(<MyBookingsPage {...baseProps} />);

    expect(screen.getByText(/caricamento/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/nessuna prenotazione/i)).toBeInTheDocument();
    });
  });

  it('displays error state when API fails and allows retry', async () => {
    // First call fails
    mockFetchOnce(500, { error: 'server_error' });
    render(<MyBookingsPage {...baseProps} />);

    const err = await screen.findByText(/errore/i);
    expect(err).toBeInTheDocument();

    // Next retry succeeds
    const items: UserBookingItemDto[] = [makeItem('1', '2026-01-16T09:00:00Z')];
    mockFetchOnce(200, { items, page: 1, size: 20, hasMore: false });

    await userEvent.click(screen.getByRole('button', { name: /riprova/i }));

    const row = await screen.findByTestId('booking-row');
    expect(row).toBeInTheDocument();
  });
});
