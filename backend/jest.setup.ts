// Jest global setup for backend tests
// - Set test environment variables for JWT
// - Silence console noise during tests

process.env.NODE_ENV = 'test';
process.env.JWT_ALG = 'HS256';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-access';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-secret-refresh';
// Default TTLs; individual tests can create custom tokens to simulate expiry
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '5m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '60s';

// Avoid leaking logs in CI; do not print sensitive data
const noop = () => {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(jest.spyOn(console, 'log') as any).mockImplementation(noop);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(jest.spyOn(console, 'warn') as any).mockImplementation(noop);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(jest.spyOn(console, 'error') as any).mockImplementation(noop);
