import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '../../../src/components/profile/ProfilePage';

// Utility to mock fetch with a queue of responses (minimal shape, no Response dependency)
function createFetchMock() {
  const calls: any[] = [];
  const queue: Array<() => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>> = [];
  const mock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    const next = queue.shift();
    if (!next) throw new Error('No fetch mock queued');
    return next();
  });
  return {
    mock,
    calls,
    enqueueJson: (data: any, opts: { status?: number } = {}) => {
      queue.push(async () => ({
        ok: (opts.status ?? 200) >= 200 && (opts.status ?? 200) < 300,
        status: opts.status ?? 200,
        json: async () => data,
      }));
    },
    enqueueError: (message = 'Server error', status = 500) => {
      queue.push(async () => ({
        ok: false,
        status,
        json: async () => ({ message }),
      }));
    },
  };
}

describe('ProfilePage - unit and interaction tests', () => {
  const user = userEvent.setup();
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = (global as any).fetch;
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  function setupWithFetch(initialProfile = { firstName: 'Mario', lastName: 'Rossi', avatarUrl: 'https://img.example/a.png' }) {
    const f = createFetchMock();
    (global as any).fetch = f.mock;
    // First call: GET profile
    f.enqueueJson(initialProfile);
    render(<ProfilePage />);
    return f;
  }

  const firstNameLabel = /^(?:nome|first\s*name|name)$/i;
  const lastNameLabel = /^(?:cognome|last\s*name|surname)$/i;
  const avatarLabel = /^(?:avatar|image|photo|avatar\s*url)$/i;

  it('renders form fields and loads initial profile from API', async () => {
    const f = setupWithFetch();

    // Wait for fields to be filled after initial load
    const firstName = await screen.findByLabelText(firstNameLabel);
    const lastName = screen.getByLabelText(lastNameLabel);
    const avatar = screen.getByLabelText(avatarLabel);

    await waitFor(() => {
      expect((firstName as HTMLInputElement).value).toBe('Mario');
      expect((lastName as HTMLInputElement).value).toBe('Rossi');
      expect((avatar as HTMLInputElement).value).toBe('https://img.example/a.png');
    });

    // Ensure a GET request happened
    expect(f.calls.length).toBeGreaterThan(0);
    const firstCall = f.calls[0];
    expect(String(firstCall.input)).toMatch(/profile/i);
    expect((firstCall.init?.method ?? 'GET')).toBe('GET');
  });

  it('validates required fields on submit and prevents API call', async () => {
    const f = setupWithFetch();

    const firstName = await screen.findByLabelText(firstNameLabel);
    const lastName = screen.getByLabelText(lastNameLabel);

    await user.clear(firstName);
    await user.clear(lastName);

    const submit = screen.getByRole('button', { name: /salva|save|aggiorna|update/i });
    await user.click(submit);

    // No PUT should be called yet (only initial GET)
    expect(f.calls.length).toBe(1);

    // Expect validation messages to appear (generic text to match i18n variants)
    expect(await screen.findAllByText(/obbligatorio|required|campo obbligatorio/i)).toBeTruthy();
  });

  it('trims inputs and sends formatted payload on save (happy path)', async () => {
    const f = setupWithFetch();

    const firstName = await screen.findByLabelText(firstNameLabel);
    const lastName = screen.getByLabelText(lastNameLabel);
    const avatar = screen.getByLabelText(avatarLabel);

    await user.clear(firstName);
    await user.type(firstName, '  Maria  ');
    await user.clear(lastName);
    await user.type(lastName, '  Bianchi ');
    await user.clear(avatar);
    await user.type(avatar, '  https://cdn.example.com/pic.jpg  ');

    // Queue PUT success response
    f.enqueueJson({ ok: true });

    const submit = screen.getByRole('button', { name: /salva|save|aggiorna|update/i });
    await user.click(submit);

    await waitFor(() => {
      // 1 GET + 1 PUT
      expect(f.calls.length).toBe(2);
    });

    const put = f.calls[1];
    expect((put.init?.method || 'GET').toUpperCase()).toBe('PUT');
    expect(String(put.input)).toMatch(/profile/i);
    const body = put.init?.body ? JSON.parse(put.init.body as string) : {};

    // Expect trimmed payload
    expect(body.firstName).toBe('Maria');
    expect(body.lastName).toBe('Bianchi');
    expect(body.avatarUrl).toBe('https://cdn.example.com/pic.jpg');

    // Success feedback shown (generic match)
    await waitFor(async () => {
      expect(
        screen.queryByText(/salvato|aggiornato|profilo aggiornato|saved|updated/i)
      ).toBeTruthy();
    });
  });

  it('shows server error message when update fails', async () => {
    const f = setupWithFetch();

    const firstName = await screen.findByLabelText(firstNameLabel);
    const lastName = screen.getByLabelText(lastNameLabel);

    await user.clear(firstName);
    await user.type(firstName, 'Luca');
    await user.clear(lastName);
    await user.type(lastName, 'Verdi');

    // Queue PUT error
    f.enqueueError('Errore di server', 500);

    const submit = screen.getByRole('button', { name: /salva|save|aggiorna|update/i });
    await user.click(submit);

    // Wait for error state
    await waitFor(() => {
      // 1 GET + 1 PUT
      expect(f.calls.length).toBe(2);
    });

    // Look for a generic error indicator
    expect(
      screen.getByText(/errore|non riuscito|failed|impossibile/i)
    ).toBeTruthy();
  });
});
