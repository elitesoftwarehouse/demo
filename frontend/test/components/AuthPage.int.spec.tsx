import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthPage, AuthPageComponent } from '../../src/components/auth';

// Use the exported default and named to confirm both work

describe('AuthPage UI integration', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    localStorage.clear();
  });

  it('renders login and signup forms and handles login success', async () => {
    (global as any).fetch = jest.fn()
      // login
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { accessToken: 'acc', tokenType: 'Bearer', expiresIn: 60, refreshToken: 'ref', user: { id: 'u1', email: 'e@example.com', status: 'ACTIVE' } } })
      });

    const onAuthenticated = jest.fn();
    render(<AuthPage onAuthenticated={onAuthenticated} apiBaseUrl="" />);

    // Fields present
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'e@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'P@ssw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
    expect(localStorage.getItem('auth.accessToken')).toBe('acc');
  });

  it('switches to signup tab and shows errors from API', async () => {
    (global as any).fetch = jest.fn()
      // signup returning conflict error
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ success: false, error: { message: 'Email already exists', code: 'CONFLICT' } }) });

    render(<AuthPageComponent mode="signup" apiBaseUrl="" />);

    // on signup page already
    expect(screen.getAllByText('Signup')[0]).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'exists@example.com');
    await userEvent.type(screen.getAllByPlaceholderText('••••••••')[0], 'StrongP@ss1');
    await userEvent.type(screen.getAllByPlaceholderText('••••••••')[1], 'StrongP@ss1');
    await userEvent.click(screen.getByRole('button', { name: 'Signup' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email already exists'));
  });
});
