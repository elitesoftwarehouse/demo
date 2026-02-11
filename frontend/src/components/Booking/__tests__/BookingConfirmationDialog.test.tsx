import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingConfirmationDialog } from '../BookingConfirmationDialog';
import type { BookingPreview } from '../../Dashboard/DashboardPage';

// declare jest for TS without @types/jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

function makePreview(overrides?: Partial<BookingPreview>): BookingPreview {
  return {
    deskId: 'D01',
    deskName: 'Postazione D01',
    bookingDate: new Date(2024, 1, 1), // 01/02/2024 local
    building: null,
    floor: null,
    ...overrides,
  };
}

describe('BookingConfirmationDialog', () => {
  test('renders correct data (desk and formatted date)', () => {
    const preview = makePreview();
    render(
      <BookingConfirmationDialog
        isOpen={true}
        preview={preview}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Conferma prenotazione/i })).toBeInTheDocument();
    expect(screen.getByText(/Postazione:/i)).toBeInTheDocument();
    expect(screen.getByText(/Postazione D01 \(D01\)/)).toBeInTheDocument();
    // dd/mm/yyyy
    expect(screen.getByText('01/02/2024')).toBeInTheDocument();
  });

  test('emits onConfirm with preview when clicking Conferma', async () => {
    const user = userEvent.setup();
    const preview = makePreview();
    const onConfirm = jest.fn();

    render(
      <BookingConfirmationDialog
        isOpen={true}
        preview={preview}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Conferma/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(preview);
  });

  test('emits onCancel when clicking Annulla', async () => {
    const user = userEvent.setup();
    const preview = makePreview();
    const onCancel = jest.fn();

    render(
      <BookingConfirmationDialog
        isOpen={true}
        preview={preview}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Annulla/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('emits onCancel when pressing Escape', () => {
    const preview = makePreview();
    const onCancel = jest.fn();

    render(
      <BookingConfirmationDialog
        isOpen={true}
        preview={preview}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('shows loading state: button disabled, aria-busy, text', () => {
    const preview = makePreview();

    render(
      <BookingConfirmationDialog
        isOpen={true}
        preview={preview}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        loading={true}
      />,
    );

    const btn = screen.getByRole('button', { name: /Conferma…/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });
});
