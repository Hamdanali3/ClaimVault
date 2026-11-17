import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

export function computeSha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function computeTextCanonicalSha256(rawText: string): string {
  const normalized = rawText.trim().replace(/\s+/g, ' ');
  return computeSha256Hex(Buffer.from(normalized, 'utf8'));
}

/**
 * Hashes a password with Argon2id (native Node 24 crypto.argon2) and falls back
 * to scrypt only if an older runtime lacks crypto.argon2.
 */
export async function hashPasswordArgon2id(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const memory = 16384; // 16 MiB
  const passes = 2;
  const parallelism = 1;
  const tagLength = 32;

  const maybeArgon2 = (crypto as unknown as {
    argon2?: (
      alg: string,
      opts: Record<string, unknown>,
      cb: (err: Error | null, key: Buffer) => void,
    ) => void;
  }).argon2;

  if (typeof maybeArgon2 === 'function') {
    const derived = await new Promise<Buffer>((resolve, reject) => {
      maybeArgon2(
        'argon2id',
        {
          message: password,
          nonce: salt,
          parallelism,
          memory,
          passes,
          tagLength,
        },
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        },
      );
    });
    return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${salt.toString('base64')}$${derived.toString('base64')}`;
  }

  const scryptDerived = (await scryptAsync(password, salt, 32)) as Buffer;
  return `$scrypt$${salt.toString('base64')}$${scryptDerived.toString('base64')}`;
}

export async function verifyPasswordHash(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('$argon2id$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 6) return false;
    const paramsPart = parts[3];
    const saltB64 = parts[4];
    const expectedB64 = parts[5];
    const paramPairs = Object.fromEntries(
      paramsPart.split(',').map((kv) => {
        const [k, v] = kv.split('=');
        return [k, Number(v)];
      }),
    );
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(expectedB64, 'base64');

    const maybeArgon2 = (crypto as unknown as {
      argon2?: (
        alg: string,
        opts: Record<string, unknown>,
        cb: (err: Error | null, key: Buffer) => void,
      ) => void;
    }).argon2;
    if (typeof maybeArgon2 !== 'function') return false;

    const derived = await new Promise<Buffer>((resolve, reject) => {
      maybeArgon2(
        'argon2id',
        {
          message: password,
          nonce: salt,
          parallelism: paramPairs.p || 1,
          memory: paramPairs.m || 16384,
          passes: paramPairs.t || 2,
          tagLength: expected.length,
        },
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        },
      );
    });

    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }

  if (storedHash.startsWith('$scrypt$')) {
    const [, , saltB64, expectedB64] = storedHash.split('$');
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(expectedB64, 'base64');
    const derived = (await scryptAsync(password, salt, expected.length)) as Buffer;
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  }

  return false;
}
