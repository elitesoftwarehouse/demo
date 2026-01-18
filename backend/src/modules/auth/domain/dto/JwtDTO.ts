// DTOs per JWT login/refresh flow
// Importante: non includere mai hash o token sensibili nei log

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  roles?: string[]; // opzionale finché non esistono ruoli
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  ver?: number; // versione claims
  tenant?: string; // opzionale
}

export interface TokenResponseDTO {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // seconds
  refreshToken?: string; // opzionale se consegnato via cookie
}

export interface RefreshRequestDTO {
  refreshToken: string; // plain token fornito dal client
}
