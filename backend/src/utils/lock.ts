// Minimal async lock utility to serialize critical sections by key
// Usage: await withLock('key', async () => { /* critical */ })

const chains = new Map<string, Promise<void>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) || Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  // Chain the current to the previous, so next callers will await this one
  chains.set(
    key,
    previous
      .then(() => current)
      .catch(() => current)
  );

  // Wait previous lock to complete
  await previous;

  try {
    const result = await fn();
    return result;
  } finally {
    // Release current lock
    release();
    // Cleanup if this lock is the last in chain
    if (chains.get(key) === current) {
      chains.delete(key);
    }
  }
}
