import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BookingConfirmationDialog } from '../../src/components/dashboard/BookingConfirmationDialog';

describe('BookingConfirmationDialog', () => {
  const preview = {
    date: new Date('2026-01-15T10:00:00Z'),
    deskId: 'd1',
    deskName: 'Desk 1',
    floor: 2,
    building: 'A',
  } as const;

  it('renders details and handles confirm/cancel', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <BookingConfirmationDialog
        isOpen
        bookingPreview={preview as any}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('booking-desk')).toHaveTextContent('Desk 1');

    fireEvent.click(screen.getByText('Annulla'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables confirm while loading', () => {
    const onConfirm = jest.fn();

    render(
      <BookingConfirmationDialog
        isOpen
        bookingPreview={preview as any}
        onConfirm={onConfirm}
        onCancel={() => {}}
        confirmLoading
      />
    );

    const btn = screen.getByText('Conferma…');
    expect(btn).toBeDisabled();
  });
});
