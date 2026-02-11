import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import AppRouter from '../AppRouter';

// Mock authService to control login behavior
jest.mock('../../auth/authService', () => ({
  login: jest.fn(async () => ({
    isAuthenticated: true,
    accessToken: 'at',
    refreshToken: 'rt',
    user: { id: 'u1', email: 'user@example.com' },
  })),
  signup: jest.fn(async (email: string) => ({ user: { id: 'u2', email } })),
}));

describe('Router integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  function renderApp(initialEntries: string[] = ['/']) {
    return render(
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <AppRouter />
        </MemoryRouter>
      </AuthProvider>,
    );
  }

  it('redirects unauthenticated users to /login and then to dashboard after login', async () => {
    renderApp(['/projects']);

    // Should see AuthPage
    expect(screen.getByText('auth.login')).toBeInTheDocument();

    // Fill and submit login
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('auth.password_placeholder'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.login' }));

    // After login it should navigate to originally requested route (/projects) then ProtectedRoute redirects to dashboard '/'
    // Assert dashboard is visible
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });
});
