import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardPostazioni, Desk } from './DashboardPostazioni';

function buildDesks(): Desk[] {
  return Array.from({ length: 12 }).map((_, i) => ({
    id: `d-${i + 1}`,
    name: `Desk ${i + 1}`,
    status: i % 3 === 0 ? 'FREE' : i % 3 === 1 ? 'OCCUPIED' : 'UNAVAILABLE',
  }));
}

describe('DashboardPostazioni', () => {
  it('renders grid with 12 cells and allows selection', async () => {
    render(<DashboardPostazioni desks={buildDesks()} />);

    const cells = await screen.findAllByRole('gridcell');
    expect(cells.length).toBe(12);

    // Click the first FREE desk
    const first = cells[0];
    fireEvent.click(first);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Prenota')).toBeInTheDocument();
  });

  it('calls onBook when pressing prenota on a FREE desk', () => {
    const desks = buildDesks();
    desks[0].status = 'FREE';

    const onBook = jest.fn();
    render(<DashboardPostazioni desks={desks} onBook={onBook} />);

    const first = screen.getAllByRole('gridcell')[0];
    fireEvent.click(first);

    const btn = screen.getByText('Prenota');
    fireEvent.click(btn);

    expect(onBook).toHaveBeenCalled();
  });

  it('shows loading and error states when fetching', async () => {
    const fetchDesks = jest.fn().mockRejectedValue(new Error('Boom'));
    render(<DashboardPostazioni fetchDesks={fetchDesks} />);

    expect(screen.getByRole('status')).toBeInTheDocument();

    // After fetch fails, error should appear
    // Use findBy to wait for UI update
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Errore: Boom');
  });
});
