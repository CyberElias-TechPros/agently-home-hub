import { webcrypto } from 'node:crypto';

// Web Crypto is a global in Node 20+, but not in every CI image. The API relies
// on it (PBKDF2, HMAC, randomUUID), so fail loudly rather than with a confusing
// "crypto is not defined" deep inside a domain function.
//
// The cast is needed because `@cloudflare/workers-types` declares `crypto` as a
// read-only global, which is true at runtime in a Worker but not in Node where
// this shim runs.
const globals = globalThis as { crypto?: unknown };
if (!globals.crypto || !(globals.crypto as Crypto).subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
