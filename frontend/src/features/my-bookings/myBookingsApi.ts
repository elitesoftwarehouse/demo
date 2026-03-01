// myBookingsApi.ts - API client for user's bookings list with pagination and filtering

import { httpRequest } from '../../app/http/httpClient';
import type { MyBookingsQuery, MyBookingsResponse } from './types';

function buildQuery(params: MyBookingsQuery): string {
  const qs = new URLSearchParams();
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.state) qs.set('state', params.state);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.search && params.search.trim()) qs.set('search', params.search.trim());
  // enforce chronological sort as per spec
  qs.set('sort', 'chronological');
  return qs.toString();
}

export async function fetchMyBookings(params: MyBookingsQuery): Promise<MyBookingsResponse> {
  const qs = buildQuery(params);
  const res = await httpRequest<MyBookingsResponse>(`/bookings/my${qs ? `?${qs}` : ''}` , {
    method: 'GET',
    auth: true,
  });
  return res.data;
}
