// profileService.ts - helper functions to fetch and update the authenticated user's profile
// Uses existing token helpers from authToken.ts

import { getAccessToken } from './authToken';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

function authHeaders() {
  const token = getAccessToken();
  if (!token) return {} as Record<string, string>;
  return { Authorization: `Bearer ${token}` } as Record<string, string>;
}

export async function getProfile(apiBaseUrl = ''): Promise<UserProfile> {
  const res = await fetch(`${apiBaseUrl}/api/user/profile`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...authHeaders(),
    },
  });

  const body = await safeJson(res);
  if (!res.ok || !body?.success) {
    const message = body?.error?.message || `Failed to fetch profile (${res.status})`;
    throw new Error(message);
  }
  return body.data as UserProfile;
}

export async function updateProfile(input: UpdateProfileInput, apiBaseUrl = ''): Promise<UserProfile> {
  const res = await fetch(`${apiBaseUrl}/api/user/profile`, {
    method: 'PATCH',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(input),
  });

  const body = await safeJson(res);
  if (!res.ok || !body?.success) {
    const message = body?.error?.message || `Failed to update profile (${res.status})`;
    const e: any = new Error(message);
    e.details = body?.error?.details || [];
    throw e;
  }
  return body.data as UserProfile;
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
