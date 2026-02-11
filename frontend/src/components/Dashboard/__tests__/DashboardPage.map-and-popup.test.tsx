import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage, { type Desk } from '../DashboardPage';

// declare jest for TS without @types/jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

// Mock booking client to avoid real network
jest.mock('../../../api/bookingClient', () => ({
  createDeskBooking: jest.fn().mockResolvedValue({ bookingId: 'b-1', status: 'ok' }),
}));

// Mock useAuth to provide access token/user for booking call
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    loading: false,
    error: null,
    state: {
      isAuthenticated: true,
      accessToken: 'AT',
      refreshToken: 'RT',
      user: { id: 'u1', email: 'u@ex.com' },
    },
  }),
}));

// Mock useDesksData to avoid timers/polling
jest.mock('../useDesksData', () => ({
  useDesksData: () => ({
    desks: [],
    loading: false,
    error: null,
    lastUpdated: null,
    refresh: jest.fn(),
  }),
}));

describe('DashboardPage - map selection and confirmation popup', () => {
  const baseDesks: Desk[] = [
    { id: 'D01', name: 'Postazione D01', x: 10, y: 10, status: 'free' },
    { id: 'D02', name: 'Postazione D02', x: 20, y: 20, status: 'busy' },
  ];

  test('clicking on a FREE desk opens confirmation popup with correct data', async () => {
    const user = userEvent.setup();
    render(<DashboardPage desks={baseDesks} bookingDate={new Date(2024, 1, 1)} />);

    // Find the desk marker for D01 (role button for clickable)
    const marker = screen.getByRole('button', { name: /Postazione D01|D01/i });
    await user.click(marker);

    // Drawer shows, then pressing "Prenota" opens confirmation dialog
    const prenotaBtn = screen.getByRole('button', { name: /Prenota/i });
    await user.click(prenotaBtn);

    // Dialog should appear with formatted date and desk info
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Postazione D01 \(D01\)/)).toBeInTheDocument();
    expect(within(dialog).getByText('01/02/2024')).toBeInTheDocument();
  });

  test('clicking on a NON-FREE desk does not open confirmation flow', async () => {
    const user = userEvent.setup();
    render(<DashboardPage desks={baseDesks} bookingDate={new Date(2024, 1, 1)} />);

    // Busy desk is not clickable (role img)
    const markerBusy = screen.getByRole('img', { name: /Postazione D02/i });
    await user.click(markerBusy);

    // No sheet actions should be rendered for booking this desk
    expect(screen.queryByRole('button', { name: /Prenota/i })).not.toBeInTheDocument();
  });

  test('selection state toggles and confirm triggers booking client and resets selection', async () => {
    const user = userEvent.setup();
    const { createDeskBooking } = require('../../../api/bookingClient');

    render(<DashboardPage desks={baseDesks} bookingDate={new Date(2024, 1, 1)} />);

    // Click free desk marker -> open sheet, then open dialog
    const marker = screen.getByRole('button', { name: /Postazione D01|D01/i });
    await user.click(marker);
    await user.click(screen.getByRole('button', { name: /Prenota/i }));

    // Confirm booking in dialog
    await user.click(screen.getByRole('button', { name: /Conferma/i }));

    // Booking API called with expected payload
    expect(createDeskBooking).toHaveBeenCalledTimes(1);
    const args = (createDeskBooking as jest.Mock).mock.calls[0][0];
    expect(args).toMatchObject({ deskId: 'D01', date: '2024-02-01', userId: 'u1' });

    // Dialog should close after success
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
