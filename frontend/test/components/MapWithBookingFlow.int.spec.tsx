import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MapWithBookingFlow } from '../../src/components/dashboard/MapWithBookingFlow';

// Integration test: select a free desk and see the dialog; then confirm

describe('MapWithBookingFlow integration', () => {
  it('opens dialog when clicking a free desk and can confirm', async () => {
    render(<MapWithBookingFlow />);

    const freeDesk = await screen.findByTestId('desk-1');
    fireEvent.click(freeDesk);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Conferma'));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
