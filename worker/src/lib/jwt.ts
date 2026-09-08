/**
 * Minimal HS256 JWT implementation on Web Crypto.
 *
 * Only the claims Agently needs are supported. Importantly the `alg` header is
 * validated on verification so an attacker cannot downgrade to `none` or swap
 * in a different algorithm.
 */

import { timingSafeEqual } from './crypto';

export interface AccessTokenClaims {
  sub: string;
  role: string;
  email: string;
  /** Token family id — lets us revoke a whole "session" at once. */
  sid: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalised.padEnd(normalised.length + ((4 - (normalised.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function signAccessToken(
  claims: Omit<AccessTokenClaims, 'iat' | 'exp' | 'iss' | 'aud'>,
  secret: string,
  options: { ttlSeconds: number; issuer: string; audience: string }
): Promise<{ token: string; expiresAt: string }> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + options.ttlSeconds;

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: AccessTokenClaims = {
    ...claims,
    iat: issuedAt,
    exp: expiresAt,
    iss: options.issuer,
    aud: options.audience,
  };

  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign('HMAC', await importKey(secret), encoder.encode(signingInput));
  return {
    token: `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export type VerifyFailureReason =
  | 'malformed'
  | 'unsupported_algorithm'
  | 'bad_signature'
  | 'expired'
  | 'wrong_issuer'
  | 'wrong_audience';

export type VerifyResult =
  | { ok: true; claims: AccessTokenClaims }
  | { ok: false; reason: VerifyFailureReason };

export async function verifyAccessToken(
  token: string,
  secret: string,
  options: { issuer: string; audience: string; clockSkewSeconds?: number }
): Promise<VerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header: { alg?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedHeader)));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (header.alg !== 'HS256') return { ok: false, reason: 'unsupported_algorithm' };

  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', await importKey(secret), encoder.encode(`${encodedHeader}.${encodedPayload}`))
  );
  let provided: Uint8Array;
  try {
    provided = base64UrlDecode(encodedSignature);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!timingSafeEqual(expected, provided)) return { ok: false, reason: 'bad_signature' };

  let claims: AccessTokenClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const skew = options.clockSkewSeconds ?? 30;
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp + skew < now) return { ok: false, reason: 'expired' };
  if (claims.iss !== options.issuer) return { ok: false, reason: 'wrong_issuer' };
  if (claims.aud !== options.audience) return { ok: false, reason: 'wrong_audience' };

  return { ok: true, claims };
}
