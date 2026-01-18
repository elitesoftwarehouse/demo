import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MapWithBookingFlow from './MapWithBookingFlow';

// Integration test: FREE desk -> open dialog -> confirm -> booking service called -> dialog closes

describe('MapWithBookingFlow - integration', () => {
  it('select free desk, confirm booking, calls service and closes dialog', async () => {
    const date = new Date('2024-04-01T00:00:00Z');
    const desks = [
      { id: 'd1', number: 1, status: 'FREE' },
      { id: 'd2', number: 2, status: 'BOOKED' },
    ] as any[];

    const bookDesk = jest.fn().mockResolvedValue({ ok: true });

    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <MapWithBookingFlow {...({ date, desks, bookDesk } as any)} />
    );

    // Click FREE desk 1
    const freeDesk = await screen.findByText(/1/);
    fireEvent.click(freeDesk);

    // Dialog should open with confirm button
    const confirmBtn = await screen.findByRole('button', { name: /conferma/i });
    expect(confirmBtn).toBeInTheDocument();

    // Confirm
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(bookDesk).toHaveBeenCalled());
    const args = bookDesk.mock.calls[0][0];
    expect(args).toMatchObject({ deskId: 'd1', date: date });

    // After resolve, dialog should be closed (confirm button not present)
    await waitFor(() => expect(screen.queryByRole('button', { name: /conferma/i })).toBeNull());
  });
});
