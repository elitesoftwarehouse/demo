/**
 * Utility to redact sensitive fields from objects before logging.
 * It clones the object shallowly and replaces configured keys with "[REDACTED]".
 */
export function redact<T extends Record<string, any>>(obj: T, keys: string[]): T {
  if (!obj) return obj;
  const clone: any = { ...obj };
  for (const key of keys) {
    if (key in clone && clone[key] !== undefined) {
      clone[key] = '[REDACTED]';
    }
  }
  return clone;
}
