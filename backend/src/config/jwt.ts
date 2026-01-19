import jwt, { Algorithm } from 'jsonwebtoken';

// Centralized JWT configuration and helpers
// Supports HS256 (default) and RS256 via env configuration
//
// Env vars:
// - JWT_ALG: 'HS256' | 'RS256' (default: HS256)
// - JWT_EXPIRES_IN: access token TTL (e.g. '30m')
// - JWT_REFRESH_EXPIRES_IN: refresh token TTL (e.g. '7d')
// - For HS256:
//   - JWT_SECRET (required)
//   - JWT_REFRESH_SECRET (optional, fallback to JWT_SECRET)
// - For RS256:
//   - JWT_PRIVATE_KEY (required for signing access)
//   - JWT_PUBLIC_KEY (required for verifying access)
//   - JWT_REFRESH_PRIVATE_KEY (optional, fallback to JWT_PRIVATE_KEY)
//   - JWT_REFRESH_PUBLIC_KEY (optional, fallback to JWT_PUBLIC_KEY)

export interface JwtPayload {
  sub: string; // userId
  role?: string;
  tenantId?: string;
}

function getAlgorithm(): Algorithm {
  const alg = (process.env.JWT_ALG || 'HS256').toUpperCase();
  if (alg !== 'HS256' && alg !== 'RS256') return 'HS256';
  return alg as Algorithm;
}

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '30m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function getAccessSecrets() {
  const algorithm = getAlgorithm();
  if (algorithm === 'HS256') {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Missing JWT_SECRET');
    return { algorithm, secret } as const;
  }
  // RS256
  const privateKey = process.env.JWT_PRIVATE_KEY;
  const publicKey = process.env.JWT_PUBLIC_KEY;
  if (!privateKey || !publicKey) throw new Error('Missing RSA keys for JWT');
  return { algorithm, privateKey, publicKey } as const;
}

function getRefreshSecrets() {
  const algorithm = getAlgorithm();
  if (algorithm === 'HS256') {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('Missing JWT_REFRESH_SECRET');
    return { algorithm, secret } as const;
  }
  // RS256
  const privateKey = process.env.JWT_REFRESH_PRIVATE_KEY || process.env.JWT_PRIVATE_KEY;
  const publicKey = process.env.JWT_REFRESH_PUBLIC_KEY || process.env.JWT_PUBLIC_KEY;
  if (!privateKey || !publicKey) throw new Error('Missing RSA keys for refresh JWT');
  return { algorithm, privateKey, publicKey } as const;
}

export function signAccessToken(payload: JwtPayload) {
  const secrets = getAccessSecrets();
  if (secrets.algorithm === 'HS256') {
    return jwt.sign(payload, secrets.secret, {
      algorithm: secrets.algorithm,
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }
  return jwt.sign(payload, secrets.privateKey, {
    algorithm: secrets.algorithm,
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function signRefreshToken(payload: JwtPayload) {
  const secrets = getRefreshSecrets();
  const minimalPayload = { sub: payload.sub } as JwtPayload;
  if (secrets.algorithm === 'HS256') {
    return jwt.sign(minimalPayload, secrets.secret, {
      algorithm: secrets.algorithm,
      expiresIn: REFRESH_TOKEN_TTL,
    });
  }
  return jwt.sign(minimalPayload, secrets.privateKey, {
    algorithm: secrets.algorithm,
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): any {
  const secrets = getAccessSecrets();
  if (secrets.algorithm === 'HS256') {
    return jwt.verify(token, secrets.secret, { algorithms: [secrets.algorithm] });
  }
  return jwt.verify(token, secrets.publicKey, { algorithms: [secrets.algorithm] });
}

export function verifyRefreshToken(token: string): any {
  const secrets = getRefreshSecrets();
  if (secrets.algorithm === 'HS256') {
    return jwt.verify(token, secrets.secret, { algorithms: [secrets.algorithm] });
  }
  return jwt.verify(token, secrets.publicKey, { algorithms: [secrets.algorithm] });
}

export function decodeToken(token: string): any {
  return jwt.decode(token);
}

export const jwtConfig = {
  algorithm: getAlgorithm(),
  accessTtl: ACCESS_TOKEN_TTL,
  refreshTtl: REFRESH_TOKEN_TTL,
};
