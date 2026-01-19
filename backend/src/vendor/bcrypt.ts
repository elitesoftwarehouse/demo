import crypto from 'crypto';

function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function hash(password: string, rounds = 10): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 10000 + rounds * 100; // pseudo cost factor
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2$${salt}$${iterations}$${derived.toString('hex')}`;
}

export async function compare(password: string, stored: string): Promise<boolean> {
  try {
    if (!stored.startsWith('pbkdf2$')) return false;
    const [, salt, iterStr, hashHex] = stored.split('$');
    const iterations = parseInt(iterStr, 10);
    const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    return timingSafeEqual(Buffer.from(hashHex, 'hex'), derived);
  } catch {
    return false;
  }
}

export default { hash, compare };
