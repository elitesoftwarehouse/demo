import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyBookings } from '../../bookings/MyBookings';

function mockFetchOnce(status: number, body: any) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('MyBookings - cancellation UI', () => {
  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });
  afterEach(() => {
    (window.confirm as any).mockRestore?.();
    (global as any).fetch = undefined as any;
  });

  it('disables cancel button when start within 24h (pre-check)', () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const bookings = [{ id: 'b1', status: 'ATTIVA', startAt: soon }];

    render(<MyBookings bookings={bookings} />);

    const btn = screen.getByRole('button', { name: /cancella prenotazione b1/i });
    expect(btn).toBeDisabled();
  });

  it('removes booking from list on successful cancellation', async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    const bookings = [{ id: 'b1', status: 'ATTIVA', startAt: future }];

    mockFetchOnce(200, { success: true, data: { id: 'b1', status: 'CANCELLATA' } });

    render(<MyBookings bookings={bookings} />);

    const btn = screen.getByRole('button', { name: /cancella prenotazione b1/i });
    expect(btn).toBeEnabled();

    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.queryByText(/b1/i)).not.toBeInTheDocument();
    });
  });

  it('shows backend error when 24h rule violated server-side', async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    const bookings = [{ id: 'b2', status: 'ATTIVA', startAt: future }];

    mockFetchOnce(400, { success: false, error: { code: 'BOOKING_CANCELLATION_WINDOW', message: 'Less than 24h' } });

    render(<MyBookings bookings={bookings} />);

    const btn = screen.getByRole('button', { name: /cancella prenotazione b2/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/mancano meno di 24 ore/i);
    });
  });
});
