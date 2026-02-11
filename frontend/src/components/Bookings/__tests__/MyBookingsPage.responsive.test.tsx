/* @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MyBookingsPage } from '../MyBookingsPage';

function mockFetchOnce(status: number, body: any) {
  (global as any).fetch = jest.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('MyBookingsPage - responsiveness smoke', () => {
  afterEach(() => {
    (global as any).fetch = undefined;
    jest.clearAllMocks();
  });

  const renderWithSize = (w: number) => {
    (global as any).innerWidth = w;
    (global as any).dispatchEvent && (global as any).dispatchEvent(new Event('resize'));
    mockFetchOnce(200, { items: [], page: 1, size: 20, hasMore: false });
    render(<MyBookingsPage baseUrl="/api" />);
  };

  it('renders correctly on mobile width', async () => {
    renderWithSize(375);
    expect(await screen.findByText(/nessuna prenotazione/i)).toBeInTheDocument();
  });

  it('renders correctly on desktop width', async () => {
    renderWithSize(1280);
    expect(await screen.findByText(/nessuna prenotazione/i)).toBeInTheDocument();
  });
});
