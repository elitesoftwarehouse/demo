// calendarApi.ts - calls backend to retrieve disabled dates for a given range
// Response shape expected: { disabledDates: string[] } where dates are ISO YYYY-MM-DD

import { httpRequest } from '../../app/http/httpClient';

export type DisabledDatesResponse = {
  disabledDates: string[];
};

export async function fetchDisabledDates(fromIso: string, toIso: string, signal?: AbortSignal): Promise<string[]> {
  const qs = new URLSearchParams({ from: fromIso, to: toIso }).toString();
  const res = await httpRequest<DisabledDatesResponse>(`/calendar/disabled-dates?${qs}`, {
    method: 'GET',
    signal,
  });
  const list = res.data?.disabledDates || [];
  return Array.isArray(list) ? list : [];
}
