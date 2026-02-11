export interface PublicUser { id: string; email: string; status?: string }
export interface LoginSuccessResponse {
  accessToken: string;
  accessTokenExpiresAt: string; // ISO
  refreshToken: string;
  refreshTokenExpiresAt: string; // ISO
  tokenType: 'Bearer' | string;
  user: PublicUser;
}
export interface SignupSuccessResponse { user: PublicUser }
export interface ApiErrorResponse { error: string; details?: any }
export type AuthClientOptions = { baseUrl?: string };

export async function login(
  payload: { email: string; password: string },
  opts?: AuthClientOptions,
): Promise<LoginSuccessResponse> {
  const base = opts?.baseUrl || '/api';
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await safeJson(res);
    const err = new Error(data?.error || `auth.login_failed_${res.status}`);
    throw err;
  }
  return (await res.json()) as LoginSuccessResponse;
}

export async function signup(
  payload: { email: string; password: string },
  opts?: AuthClientOptions,
): Promise<SignupSuccessResponse> {
  const base = opts?.baseUrl || '/api';
  const res = await fetch(`${base}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await safeJson(res);
    const err = new Error(data?.error || `auth.signup_failed_${res.status}`);
    throw err;
  }
  return (await res.json()) as SignupSuccessResponse;
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
