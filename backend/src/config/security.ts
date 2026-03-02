import dotenv from 'dotenv';

dotenv.config();

export type JwtAlgorithm = 'HS256' | 'RS256';

function normalizeMultilineKey(value?: string): string | undefined {
  if (!value) return undefined;
  // Support escaped \n in env files
  return value.replace(/\\n/g, '\n');
}

const JWT_ALG = (process.env.JWT_ALG as JwtAlgorithm) || 'HS256';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_PRIVATE_KEY = normalizeMultilineKey(process.env.JWT_PRIVATE_KEY);
const JWT_PUBLIC_KEY = normalizeMultilineKey(process.env.JWT_PUBLIC_KEY);

export const ACCESS_TOKEN_TTL_MIN = parseInt(process.env.ACCESS_TOKEN_TTL_MIN || '30', 10);
export const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);

export function getJwtAlgorithm(): JwtAlgorithm {
  return JWT_ALG;
}

export function getJwtSigningKey(): string {
  if (JWT_ALG === 'RS256') {
    if (!JWT_PRIVATE_KEY) {
      throw new Error('Missing JWT_PRIVATE_KEY for RS256');
    }
    return JWT_PRIVATE_KEY;
  }
  return JWT_SECRET;
}

export function getJwtVerifyKey(): string {
  if (JWT_ALG === 'RS256') {
    if (!JWT_PUBLIC_KEY) {
      throw new Error('Missing JWT_PUBLIC_KEY for RS256');
    }
    return JWT_PUBLIC_KEY;
  }
  return JWT_SECRET;
}

export const ACCESS_TOKEN_TTL_SEC = ACCESS_TOKEN_TTL_MIN * 60;
export const REFRESH_TOKEN_TTL_SEC = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
