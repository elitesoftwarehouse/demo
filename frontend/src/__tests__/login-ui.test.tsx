import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/auth';
import LoginPage from '../pages/LoginPage';

// Mock fetch
const mockFetch = jest.fn();

global.fetch = mockFetch as any;

function setup() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('Login UI', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  it('shows validation error for bad email', async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pwd' } });
    fireEvent.click(screen.getByRole('button', { name: /accedi/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/email valido/i);
  });

  it('performs login and stores token', async () => {
    setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accessToken: 't', expiresIn: 1800, user: { id: 'u1', email: 'e' } }),
    });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Secret' } });
    fireEvent.click(screen.getByRole('button', { name: /accedi/i }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('smartdesk/auth') || '{}');
      expect(stored.accessToken).toBe('t');
    });
  });
});
