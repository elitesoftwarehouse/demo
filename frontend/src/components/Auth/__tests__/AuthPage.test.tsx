import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../../context/AuthContext';
import AuthPage from '../AuthPage';

// Mock authService used by context
jest.mock('../../../auth/authService', () => ({
  login: jest.fn(async (email: string, password: string) => ({
    isAuthenticated: true,
    accessToken: 'at',
    refreshToken: 'rt',
    user: { id: 'u1', email },
  })),
  signup: jest.fn(async (email: string, password: string) => ({
    user: { id: 'u2', email },
  })),
}));

describe('AuthPage UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  function renderWithProvider() {
    return render(
      <AuthProvider>
        <AuthPage />
      </AuthProvider>,
    );
  }

  it('renders login form fields and button', () => {
    renderWithProvider();
    expect(screen.getByText('auth.login')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.email')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.password')).toBeInTheDocument();
  });

  it('validates inputs and shows errors client-side', async () => {
    renderWithProvider();
    const submit = screen.getByRole('button', { name: 'auth.login' });
    fireEvent.click(submit);
    expect(screen.getByText('auth.email_invalid')).toBeInTheDocument();
    expect(screen.getByText('auth.password_too_short')).toBeInTheDocument();
  });

  it('performs login and calls onSuccess', async () => {
    const onSuccess = jest.fn();
    render(
      <AuthProvider>
        <AuthPage onSuccess={onSuccess} />
      </AuthProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('auth.password_placeholder'), {
      target: { value: 'secret123' },
    });

    const btn = screen.getByRole('button', { name: 'auth.login' });
    fireEvent.click(btn);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('switches to signup and validates confirm password', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: 'auth.signup' }));
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('auth.confirm_password_placeholder'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByPlaceholderText('auth.password_placeholder'), {
      target: { value: 'different' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'auth.signup' }));

    expect(screen.getByText('auth.password_too_short')).toBeInTheDocument();
    expect(screen.getByText('auth.password_mismatch')).toBeInTheDocument();
  });
});
