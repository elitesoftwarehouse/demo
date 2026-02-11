import { renderHook, act } from '@testing-library/react';
import { useDesksData } from '../useDesksData';

// declare jest
declare const jest: any;

describe('useDesksData hook', () => {
  const origFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    global.fetch = origFetch;
  });

  test('performs periodic refresh based on pollingMs', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ desks: [] }) })) as any;

    const { result } = renderHook(() => useDesksData({ baseUrl: '/api', pollingMs: 5000 }));

    // initial call
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // advance time by 5s 3 times -> should schedule fetches (debounced by pending flag)
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
