import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MyBookings } from '../MyBookings';

const mockFetch = jest.fn();

describe('MyBookings page component', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it('shows loading then renders list from API', async () => {
    const apiData = {
      data: [
        { id: 'a', start: '2026-01-05T09:00:00Z', end: '2026-01-05T10:00:00Z', title: 'A', location: 'HQ', status: 'CONFIRMED' },
        { id: 'b', start: '2026-01-03T09:00:00Z', end: '2026-01-03T10:00:00Z', title: 'B', location: 'HQ', status: 'CONFIRMED' },
      ],
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => apiData });

    render(<MyBookings />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    const rows = screen.getAllByTestId('booking-row');
    expect(rows.length).toBe(2);

    // Sorted ascending by date (b first)
    expect(rows[0]).toHaveTextContent('B');
    expect(rows[1]).toHaveTextContent('A');
  });

  it('shows empty state when API returns empty list', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });
    render(<MyBookings />);
    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows error state on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<MyBookings />);
    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());
    expect(screen.getByTestId('error')).toBeInTheDocument();
  });
});
