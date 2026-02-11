/* @jest-environment jsdom */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MyBookingsPage } from '../MyBookingsPage';
import { bookingStateColors, normalizeBookingState } from '../statusMapper';

// declare jest for TS without types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

// Mock API client used by MyBookingsPage
jest.mock('../../../api/bookingsClient', () => {
  return {
    __esModule: true,
    listMyBookings: jest.fn(),
  };
});

// Types and helpers
import { listMyBookings } from '../../../api/bookingsClient';

type BookingItem = {
  id: string;
  deskId: string;
  startDate: string; // ISO
  status?: string;
  state?: string;
};

defineWindowSize(1024);

function defineWindowSize(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

function mockBookings(items: BookingItem[]) {
  (listMyBookings as any).mockResolvedValue({ items });
}

function makeItem(id: string, deskId: string, iso: string, state: string): BookingItem {
  return { id, deskId, startDate: iso, state };
}

function findRowByDeskId(deskId: string): HTMLElement {
  const rows = screen.getAllByTestId('booking-row');
  const row = rows.find((r) => r.textContent?.includes(deskId));
  if (!row) throw new Error(`Row for desk ${deskId} not found`);
  return row as HTMLElement;
}

const now = new Date('2026-01-17T10:00:00.000Z');

describe('MyBookingsPage - badges integration', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (listMyBookings as any).mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test('renders badges for Passata, Attiva, Cancellata with correct labels and styles', async () => {
    mockBookings([
      makeItem('b1', 'D-100', '2026-01-10T08:00:00.000Z', 'PASSATA'),
      makeItem('b2', 'D-101', '2026-01-18T08:00:00.000Z', 'ATTIVA'),
      makeItem('b3', 'D-102', '2026-01-19T08:00:00.000Z', 'CANCELLATA'),
    ]);

    render(<MyBookingsPage baseUrl="/api" />);

    const rows = await screen.findAllByTestId('booking-row');
    expect(rows.length).toBeGreaterThanOrEqual(3);

    const checks: Array<{ deskId: string; label: string; state: string }> = [
      { deskId: 'D-100', label: 'Passata', state: 'PASSATA' },
      { deskId: 'D-101', label: 'Attiva', state: 'ATTIVA' },
      { deskId: 'D-102', label: 'Cancellata', state: 'CANCELLATA' },
    ];

    checks.forEach(({ deskId, label, state }) => {
      const row = findRowByDeskId(deskId);
      const badge = within(row).getByRole('status');
      expect(badge).toHaveTextContent(label);

      const uiState = normalizeBookingState(state);
      expect(badge).toHaveAttribute('data-state', uiState);

      const colors = bookingStateColors(uiState);
      expect(badge).toHaveStyle({ backgroundColor: colors.bg, color: colors.fg });
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test('mobile and desktop viewports render readable badges and no layout errors', async () => {
    // Desktop first
    defineWindowSize(1280);
    mockBookings([
      makeItem('b1', 'D-200', '2026-01-10T08:00:00.000Z', 'PASSATA'),
      makeItem('b2', 'D-201', '2026-01-18T08:00:00.000Z', 'ATTIVA'),
      makeItem('b3', 'D-202', '2026-01-19T08:00:00.000Z', 'CANCELLATA'),
    ]);

    const { rerender } = render(<MyBookingsPage baseUrl="/api" />);
    let rows = await screen.findAllByTestId('booking-row');
    expect(rows.length).toBeGreaterThanOrEqual(3);

    // Labels present in desktop
    expect(screen.getByRole('status', { name: 'Passata' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Attiva' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Cancellata' })).toBeInTheDocument();

    // Switch to mobile
    defineWindowSize(375);
    window.dispatchEvent(new Event('resize'));

    // Rerender to simulate responsive update
    rerender(<MyBookingsPage baseUrl="/api" />);

    rows = await screen.findAllByTestId('booking-row');
    expect(rows.length).toBeGreaterThanOrEqual(3);

    // Labels present in mobile too (readability)
    expect(screen.getByRole('status', { name: 'Passata' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Attiva' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Cancellata' })).toBeInTheDocument();

    // No console errors/warnings during viewport changes
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
