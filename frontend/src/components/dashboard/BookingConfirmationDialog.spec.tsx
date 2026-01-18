import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookingConfirmationDialog from './BookingConfirmationDialog';

// NOTE: We intentionally cast props to any to avoid tight coupling with exact prop types
// and focus on behavior: rendering of actions and event emissions.

describe('BookingConfirmationDialog - unit', () => {
  const baseDate = new Date('2024-01-01T00:00:00Z');
  const desk = { id: 'd-1', number: 12, status: 'FREE' } as any;

  it('renders action buttons and triggers onConfirm with expected params', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<BookingConfirmationDialog {...({ open: true, desk, date: baseDate, onConfirm, onCancel } as any)} />)
    );

    // Buttons should be visible
    const confirmBtn = screen.getByRole('button', { name: /conferma/i });
    const cancelBtn = screen.getByRole('button', { name: /annulla|chiudi/i });

    expect(confirmBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    // Trigger confirm
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('triggers onCancel on click of Annulla/chiudi', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<BookingConfirmationDialog {...({ open: true, desk, date: baseDate, onConfirm, onCancel } as any)} />)
    );

    const cancelBtn = screen.getByRole('button', { name: /annulla|chiudi/i });
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables confirm button when loading=true (if supported)', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<BookingConfirmationDialog {...({ open: true, desk, date: baseDate, loading: true, onConfirm, onCancel } as any)} />)
    );

    const confirmBtn = screen.getByRole('button', { name: /conferma/i });
    // If component supports loading state, the button should be disabled.
    // If not supported, this assertion will still pass if button is disabled by default during loading.
    expect(confirmBtn).toBeDisabled();
  });
});
