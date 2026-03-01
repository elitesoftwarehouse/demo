// apiConfig.ts - centralize API configuration
// Reads base URL and feature flags from environment variables with safe fallbacks.
// Frontend bundlers differ: support Vite, CRA, Next-like envs.

export type ApiConfig = {
  baseUrl: string; // e.g., "/api"
  // If true, do NOT store refresh token on client and rely on httpOnly cookie set by backend
  refreshViaHttpOnlyCookie: boolean;
  // Choose where to store tokens: localStorage (default) or sessionStorage
  tokenStorage: 'local' | 'session';
};

function readEnv(name: string): string | undefined {
  // Vite
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && name in import.meta.env) {
    // @ts-ignore
    return import.meta.env[name];
  }
  // Next.js / CRA style
  if (typeof process !== 'undefined' && process.env && name in process.env) {
    return process.env[name];
  }
  return undefined;
}

function resolveBaseUrl(): string {
  const fromEnv =
    readEnv('VITE_API_BASE_URL') ||
    readEnv('NEXT_PUBLIC_API_BASE_URL') ||
    readEnv('REACT_APP_API_BASE_URL') ||
    readEnv('API_BASE_URL');
  if (fromEnv && fromEnv.trim()) return fromEnv.trim().replace(/\/$/, '');
  // Fallback: same origin under /api
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/api`;
  }
  return '/api';
}

function resolveCookieRefreshFlag(): boolean {
  const raw =
    readEnv('VITE_AUTH_REFRESH_HTTP_ONLY') ||
    readEnv('NEXT_PUBLIC_AUTH_REFRESH_HTTP_ONLY') ||
    readEnv('REACT_APP_AUTH_REFRESH_HTTP_ONLY') ||
    readEnv('AUTH_REFRESH_HTTP_ONLY');
  if (raw == null) return false; // default to client-side storage until backend cookie is configured
  return `${raw}`.toLowerCase() === 'true';
}

function resolveTokenStorage(): 'local' | 'session' {
  const raw =
    readEnv('VITE_TOKEN_STORAGE') ||
    readEnv('NEXT_PUBLIC_TOKEN_STORAGE') ||
    readEnv('REACT_APP_TOKEN_STORAGE') ||
    readEnv('TOKEN_STORAGE');
  const v = (raw || '').toLowerCase();
  if (v === 'session') return 'session';
  return 'local';
}

export const apiConfig: ApiConfig = {
  baseUrl: resolveBaseUrl(),
  refreshViaHttpOnlyCookie: resolveCookieRefreshFlag(),
  tokenStorage: resolveTokenStorage(),
};

export default apiConfig;
