import React from 'react';
import { render, screen, act } from '@testing-library/react';
import DashboardPostazioni from '../../src/components/DashboardPostazioni';

jest.mock('../../src/lib/desksApi', () => ({
  fetchDesks: jest.fn(),
}));

const { fetchDesks } = require('../../src/lib/desksApi');

describe('DashboardPostazioni component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('shows loading then renders 12 placeholders when zero items', async () => {
    fetchDesks.mockResolvedValue({ total: 0, expected: 12, missing: 12, items: [], statusCount: { FREE: 0, OCCUPIED: 0, UNAVAILABLE: 0 } });

    await act(async () => {
      render(<DashboardPostazioni baseUrl="" refreshMs={0} />);
    });

    expect(screen.getByLabelText('loading')).toBeInTheDocument();

    // flush fetch
    await act(async () => {});

    const dashboard = await screen.findByLabelText('dashboard');
    expect(dashboard).toBeInTheDocument();
    // 12 placeholders exist (empty divs)
    expect(dashboard.querySelectorAll('.bg-gray-200').length).toBe(12);
  });

  it('renders desks with correct background colors', async () => {
    fetchDesks.mockResolvedValue({
      total: 3,
      expected: 12,
      missing: 9,
      items: [
        { id: 'D1', name: 'Desk 1', status: 'FREE' },
        { id: 'D2', name: 'Desk 2', status: 'OCCUPIED' },
        { id: 'D3', name: 'Desk 3', status: 'UNAVAILABLE' },
      ],
      statusCount: { FREE: 1, OCCUPIED: 1, UNAVAILABLE: 1 },
    });

    await act(async () => {
      render(<DashboardPostazioni baseUrl="" refreshMs={0} />);
    });

    await screen.findByLabelText('dashboard');

    const d1 = screen.getByTestId('desk-D1');
    const d2 = screen.getByTestId('desk-D2');
    const d3 = screen.getByTestId('desk-D3');

    expect((d1 as HTMLElement).style.backgroundColor).toBe('rgb(34, 197, 94)');
    expect((d2 as HTMLElement).style.backgroundColor).toBe('rgb(239, 68, 68)');
    expect((d3 as HTMLElement).style.backgroundColor).toBe('rgb(156, 163, 175)');
  });

  it('shows error on API failure', async () => {
    fetchDesks.mockRejectedValue(new Error('Boom'));

    await act(async () => {
      render(<DashboardPostazioni baseUrl="" refreshMs={0} />);
    });

    await act(async () => {});

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Boom');
  });

  it('performs periodic updates', async () => {
    fetchDesks.mockResolvedValueOnce({ total: 1, expected: 12, missing: 11, items: [{ id: 'D1', name: 'Desk 1', status: 'FREE' }], statusCount: { FREE: 1, OCCUPIED: 0, UNAVAILABLE: 0 } });
    fetchDesks.mockResolvedValueOnce({ total: 2, expected: 12, missing: 10, items: [{ id: 'D1', name: 'Desk 1', status: 'FREE' }, { id: 'D2', name: 'Desk 2', status: 'OCCUPIED' }], statusCount: { FREE: 1, OCCUPIED: 1, UNAVAILABLE: 0 } });

    await act(async () => {
      render(<DashboardPostazioni baseUrl="" refreshMs={1000} />);
    });

    await act(async () => {});
    expect(fetchDesks).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(fetchDesks).toHaveBeenCalledTimes(2);
  });
});
