import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeskMapView from './DeskMapView';

// Minimal mock for booking service function that DeskMapView might call via props
// We will pass it through onConfirm in MapWithBookingFlow integration test; here focus
// on DeskMapView behavior: clicking FREE desk opens popup; non-FREE does nothing.

describe('DeskMapView - unit interactions', () => {
  const date = new Date('2024-03-10T00:00:00Z');

  function buildDesks() {
    return [
      { id: 'd1', number: 1, status: 'FREE' },
      { id: 'd2', number: 2, status: 'BOOKED' },
    ] as any[];
  }

  const baseProps = {
    date,
    desks: buildDesks(),
    onRequestBooking: jest.fn(),
  } as any;

  it('clicking FREE desk calls onRequestBooking with correct data', async () => {
    const onRequestBooking = jest.fn();
    render(<DeskMapView {...{ ...baseProps, onRequestBooking }} />);

    // Find desk element number 1 (FREE). Implementation renders numbers as text content
    const deskEl = await screen.findByText(/1/);
    fireEvent.click(deskEl);

    await waitFor(() => expect(onRequestBooking).toHaveBeenCalled());
    const arg = onRequestBooking.mock.calls[0][0];
    expect(arg).toMatchObject({ id: 'd1', number: 1, status: 'FREE' });
  });

  it('clicking non-FREE desk does not call onRequestBooking', async () => {
    const onRequestBooking = jest.fn();
    render(<DeskMapView {...{ ...baseProps, onRequestBooking }} />);

    const deskEl = await screen.findByText(/2/); // booked desk
    fireEvent.click(deskEl);

    await new Promise((r) => setTimeout(r, 10));
    expect(onRequestBooking).not.toHaveBeenCalled();
  });
});
