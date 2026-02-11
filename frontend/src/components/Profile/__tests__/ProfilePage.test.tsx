import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfilePage } from '../ProfilePage';

// Minimal AuthContext/provider mock to satisfy useAuth
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    state: { isAuthenticated: true, accessToken: 'ACCESS', user: { id: 'u1', email: 'user@example.com' } },
  }),
}));

// Mock profileClient HTTP
jest.mock('../../../api/profileClient', () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

const { getProfile, updateProfile } = require('../../../api/profileClient');

function setup() {
  return render(<ProfilePage baseUrl="/api" />);
}

describe('ProfilePage component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('renders loading then form with data loaded from API', async () => {
    (getProfile as jest.Mock).mockResolvedValueOnce({
      id: 'u1',
      email: 'user@example.com',
      firstName: 'Mario',
      lastName: 'Rossi',
      avatarUrl: 'https://example.com/a.png',
    });

    setup();

    expect(screen.getByText('profile.loading')).toBeInTheDocument();

    expect(await screen.findByLabelText('firstName')).toHaveValue('Mario');
    expect(screen.getByLabelText('lastName')).toHaveValue('Rossi');
    expect(screen.getByLabelText('avatarUrl')).toHaveValue('https://example.com/a.png');
    expect(screen.getByText('profile.email')).toBeInTheDocument();
  });

  test('client-side validations: min length and url format', async () => {
    (getProfile as jest.Mock).mockResolvedValueOnce({
      id: 'u1', email: 'user@example.com', firstName: '', lastName: '', avatarUrl: ''
    });

    setup();

    await screen.findByLabelText('firstName');

    const first = screen.getByLabelText('firstName');
    const last = screen.getByLabelText('lastName');
    const avatar = screen.getByLabelText('avatarUrl');

    fireEvent.change(first, { target: { value: 'A' } });
    fireEvent.blur(first);
    expect(await screen.findByText('profile.firstName_too_short')).toBeInTheDocument();

    fireEvent.change(last, { target: { value: 'B' } });
    fireEvent.blur(last);
    expect(await screen.findByText('profile.lastName_too_short')).toBeInTheDocument();

    fireEvent.change(avatar, { target: { value: 'not-an-url' } });
    fireEvent.blur(avatar);
    expect(await screen.findByText('profile.avatar_invalid_url')).toBeInTheDocument();
  });

  test('happy path: edit fields and submit triggers update API and shows success', async () => {
    (getProfile as jest.Mock).mockResolvedValueOnce({
      id: 'u1', email: 'user@example.com', firstName: 'Mario', lastName: 'Rossi', avatarUrl: ''
    });
    (updateProfile as jest.Mock).mockResolvedValueOnce({
      id: 'u1', email: 'user@example.com', firstName: 'Mario', lastName: 'Bianchi', avatarUrl: ''
    });

    setup();

    await screen.findByLabelText('firstName');

    fireEvent.change(screen.getByLabelText('lastName'), { target: { value: 'Bianchi' } });

    const submit = screen.getByRole('button', { name: 'profile.save' });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ firstName: 'Mario', lastName: 'Bianchi', avatarUrl: null }, { baseUrl: '/api', accessToken: 'ACCESS' });
    });

    expect(await screen.findByRole('status')).toHaveTextContent('profile.update_success');
  });

  test('server error on update shows error message', async () => {
    (getProfile as jest.Mock).mockResolvedValueOnce({ id: 'u1', email: 'user@example.com' });
    (updateProfile as jest.Mock).mockRejectedValueOnce(new Error('server.down'));

    setup();

    await screen.findByLabelText('firstName');
    fireEvent.click(screen.getByRole('button', { name: 'profile.save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('error.server.down');
  });
});
