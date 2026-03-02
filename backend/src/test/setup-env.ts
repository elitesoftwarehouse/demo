// Ensure deterministic JWT settings for tests and avoid leaking secrets
process.env.JWT_ALG = process.env.JWT_ALG || 'HS256';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-smartdesk';
process.env.ACCESS_TOKEN_TTL_MIN = process.env.ACCESS_TOKEN_TTL_MIN || '30';
process.env.REFRESH_TOKEN_TTL_DAYS = process.env.REFRESH_TOKEN_TTL_DAYS || '7';
process.env.NODE_ENV = 'test';
