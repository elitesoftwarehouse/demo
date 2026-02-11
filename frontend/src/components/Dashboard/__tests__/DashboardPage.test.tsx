import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardPage, { type Desk } from '../DashboardPage';

// declare jest
declare const jest: any;

function makeMockDesks(): Desk[] {
  return [
    { id: 'D01', name: 'P1', x: 10, y: 10, status: 'free' },
    { id: 'D02', name: 'P2', x: 20, y: 10, status: 'busy' },
    { id: 'D03', name: 'P3', x: 30, y: 10, status: 'unavailable' },
    { id: 'D04', name: 'P4', x: 40, y: 10, status: 'free' },
    { id: 'D05', name: 'P5', x: 50, y: 10, status: 'busy' },
    { id: 'D06', name: 'P6', x: 60, y: 10, status: 'unavailable' },
    { id: 'D07', name: 'P7', x: 10, y: 20, status: 'free' },
    { id: 'D08', name: 'P8', x: 20, y: 20, status: 'busy' },
    { id: 'D09', name: 'P9', x: 30, y: 20, status: 'unavailable' },
    { id: 'D10', name: 'P10', x: 40, y: 20, status: 'free' },
    { id: 'D11', name: 'P11', x: 50, y: 20, status: 'busy' },
    { id: 'D12', name: 'P12', x: 60, y: 20, status: 'unavailable' },
  ];
}

describe('DashboardPage component', () => {
  test('renders 12 desks and legend counts', () => {
    const desks = makeMockDesks();
    render(<DashboardPage desks={desks} />);

    const markers = screen.getAllByRole('button');
    expect(markers.length).toBe(12);

    expect(screen.getByText(/Libero \(4\)/)).toBeInTheDocument();
    expect(screen.getByText(/Occupato \(4\)/)).toBeInTheDocument();
    expect(screen.getByText(/Non disp\. \(4\)/)).toBeInTheDocument();
  });

  test('opens details sheet on desk click and shows booking button', () => {
    const desks = makeMockDesks();
    render(<DashboardPage desks={desks} />);
    const marker = screen.getByLabelText(/Postazione D01/);
    fireEvent.click(marker);
    expect(screen.getByText('Prenota')).toBeInTheDocument();
  });

  test('renders without JS errors in mobile-like environment', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Simulate small viewport
    (global as any).innerWidth = 360;
    render(<DashboardPage desks={makeMockDesks()} />);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
