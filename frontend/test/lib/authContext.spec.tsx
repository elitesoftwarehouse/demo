import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../src/lib/authContext';

// helper component to exercise context
function Consumer() {
  const { authenticated, user, login, logout, signup } = useAuth();
  return (
    <div>
      <div data-testid="auth">{authenticated ? 'yes' : 'no'}</div>
      <div data-testid="user">{user?.email ?? ''}</div>
      <button onClick={() => login('e@example.com', 'P@ssw0rd')}>login</button>
      <button onClick={() => signup('e@example.com', 'P@ssw0rd')}>signup</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthContext/useAuth', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    localStorage.clear();
  });

  it('initial state derives from tokens', () => {
    localStorage.setItem('auth.accessToken', 'acc');
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('auth').textContent).toBe('yes');
  });

  it('login sets state and stores tokens', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { accessToken: 'acc', tokenType: 'Bearer', expiresIn: 60, refreshToken: 'ref', user: { id: 'u1', email: 'e@example.com', status: 'ACTIVE' } } })
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('yes'));
    expect(screen.getByTestId('user').textContent).toBe('e@example.com');
    expect(localStorage.getItem('auth.accessToken')).toBe('acc');
  });

  it('logout clears state', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { accessToken: 'acc', tokenType: 'Bearer', expiresIn: 60, refreshToken: 'ref', user: { id: 'u1', email: 'e@example.com', status: 'ACTIVE' } } })
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('yes'));

    await userEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('auth').textContent).toBe('no');
    expect(localStorage.getItem('auth.accessToken')).toBeNull();
  });

  it('signup keeps unauthenticated state', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, data: { id: 'u1', email: 'e@example.com', status: 'ACTIVE', createdAt: 'now', updatedAt: 'now' } })
    });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('signup'));
    expect(screen.getByTestId('auth').textContent).toBe('no');
  });
});
