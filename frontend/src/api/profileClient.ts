export type PublicUserProfile = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  avatarId?: string | null;
};

export type UpdateUserProfilePayload = {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  avatarId?: string | null;
};

export type ProfileClientOptions = {
  baseUrl?: string;
  accessToken?: string;
};

async function safeJson(res: Response): Promise<any | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function getProfile(opts?: ProfileClientOptions): Promise<PublicUserProfile> {
  const base = opts?.baseUrl || '/api';
  const res = await fetch(`${base}/profile/me`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...(opts?.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : {}),
    },
  });
  if (!res.ok) {
    const data = await safeJson(res as any);
    const err = new Error(data?.error || `profile.load_failed_${res.status}`);
    throw err;
  }
  return (await res.json()) as PublicUserProfile;
}

export async function updateProfile(
  payload: UpdateUserProfilePayload,
  opts?: ProfileClientOptions,
): Promise<PublicUserProfile> {
  const base = opts?.baseUrl || '/api';
  const res = await fetch(`${base}/profile/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(opts?.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await safeJson(res as any);
    const err = new Error(data?.error || `profile.update_failed_${res.status}`);
    (err as any).details = data?.details;
    throw err;
  }
  return (await res.json()) as PublicUserProfile;
}
