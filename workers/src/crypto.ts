/**
 * Password hashing, UUIDs and random tokens — all Web Crypto, so this runs
 * unchanged on Cloudflare Workers, Node 18+, and browsers.
 *
 * Password format:  pbkdf2_sha256$<iterations>$<b64 salt>$<b64 hash>
 *   where salt/hash are canonical base64 (chars A-Z a-z 0-9 + / =).
 *
 * Accounts originally created via the legacy Express backend (bcryptjs)
 * carry a `$2…` bcrypt hash. Those cannot be verified with Web Crypto, so
 * `verifyPassword` returns a sentinel that lets the caller respond with a
 * clear "please reset your password" path instead of silently failing.
 */

import { PBKDF2_ITERATIONS } from './config';

const encoder = new TextEncoder();

export function uuid(): string {
  return crypto.randomUUID();
}

/** D1 primary key without dashes, optional prefix (keeps URLs clean). */
export function id(prefix = ''): string {
  const raw = crypto.randomUUID().replace(/-/g, '');
  return prefix ? `${prefix}_${raw}` : raw;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function b64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Decode a base64 string to raw bytes (binary-string safe). */
function unB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Derive a PBKDF2-SHA256 hash. `saltB64` is canonical base64 of the salt bytes. */
async function pbkdf2(password: string, saltB64: string, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: unB64(saltB64), iterations },
    keyMaterial,
    256,
  );
  return b64(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

/** Constant-time string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i += 1) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

export type PasswordCheck = { ok: true } | { ok: false; reason: 'invalid' | 'legacy_bcrypt' };

export async function verifyPassword(password: string, stored: string): Promise<PasswordCheck> {
  if (!stored) return { ok: false, reason: 'invalid' };

  if (stored.startsWith('pbkdf2_sha256$')) {
    // format: pbkdf2_sha256$<iterations>$<salt>$<hash>
    const parts = stored.split('$');
    if (parts.length !== 4) return { ok: false, reason: 'invalid' };
    const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
    const saltB64 = parts[2];
    const expected = parts[3];
    const actual = await pbkdf2(password, saltB64, iterations);
    return timingSafeEqual(actual, expected) ? { ok: true } : { ok: false, reason: 'invalid' };
  }

  if (stored.startsWith('$2')) {
    return { ok: false, reason: 'legacy_bcrypt' };
  }

  return { ok: false, reason: 'invalid' };
}

/** Generate a random opaque token (base64url, no padding). */
export function randomToken(bytes = 32): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  let bin = '';
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
