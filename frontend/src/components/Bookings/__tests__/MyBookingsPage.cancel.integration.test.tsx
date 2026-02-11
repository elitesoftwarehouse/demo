import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MyBookingsPage } from '../MyBookingsPage';

function mockFetchOnce(status: number, body: any) {
  (global as any).fetch = jest.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('MyBookingsPage - cancel flow', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T08:00:00Z'));
    (global as any).fetch = jest.fn();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows cancel and completes happy path', async () => {
    // 1) list call
    mockFetchOnce(200, {
      items: [
        {
          id: 'b1',
          startDate: '2026-01-02T09:00:00Z', // > 24h ahead
          endDate: null,
          deskId: 'D-01',
          status: 'ATTIVA',
          state: 'ATTIVA',
        },
      ],
      page: 1,
      size: 20,
      hasMore: false,
    });
    // 2) cancel call
    mockFetchOnce(200, { ok: true });

    render(<MyBookingsPage baseUrl="/api" />);

    // row visible
    await waitFor(() => expect(screen.getByText(/Le Mie Prenotazioni/i)).toBeInTheDocument());
    const btn = await screen.findByRole('button', { name: /Cancella/i });
    expect(btn).toBeEnabled();

    fireEvent.click(btn);
    // dialog appears
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    const confirm = screen.getByRole('button', { name: /Conferma/i });
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/cancellata con successo/i));
  });

  test('disables cancel within 24h and shows server error message', async () => {
    // 1) list (within 24h -> disabled)
    mockFetchOnce(200, {
      items: [
        {
          id: 'b2',
          startDate: '2026-01-01T12:00:00Z', // 4h ahead
          endDate: null,
          deskId: 'D-02',
          status: 'ATTIVA',
          state: 'ATTIVA',
        },
      ],
      page: 1,
      size: 20,
      hasMore: false,
    });

    render(<MyBookingsPage baseUrl="/api" />);

    await waitFor(() => expect(screen.getByText(/Le Mie Prenotazioni/i)).toBeInTheDocument());
    const btn = await screen.findByRole('button', { name: /Cancella/i });
    expect(btn).toBeDisabled();

    // Simulate manual attempt (e.g., UI glitch) -> open confirm and server denies
    // Re-render with enabled item to trigger call
    jest.clearAllMocks();
    (global as any).fetch = jest
      .fn()
      // list again: item >24h so enabled
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ items: [{ id: 'b3', startDate: '2026-01-03T09:00:00Z', endDate: null, deskId: 'D-03', status: 'ATTIVA', state: 'ATTIVA' }], page: 1, size: 20, hasMore: false }) })
      // cancel: backend rejects with 400 and reason key
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'booking.cannot_cancel_within_24h', details: { reasonKey: 'booking.cannot_cancel_within_24h' } }) });

    render(<MyBookingsPage baseUrl="/api" />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Cancella/i })[0]).toBeEnabled());
    fireEvent.click(screen.getAllByRole('button', { name: /Cancella/i })[0]);
    const confirm = await screen.findByRole('button', { name: /Conferma/i });
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/non può essere cancellata/i));
  });
});
