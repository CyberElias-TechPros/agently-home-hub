import { describe, expect, it } from 'vitest';
import { generateToken, hashPassword, hashToken, timingSafeEqual, verifyPassword } from './crypto';
import { signAccessToken, verifyAccessToken, type VerifyResult } from './jwt';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const stored = await hashPassword('Corrugated7-Harbour');
    await expect(verifyPassword('Corrugated7-Harbour', stored)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const stored = await hashPassword('Corrugated7-Harbour');
    await expect(verifyPassword('Corrugated7-Harbour!', stored)).resolves.toBe(false);
  });

  it('never stores the password itself', async () => {
    const stored = await hashPassword('Corrugated7-Harbour');
    expect(stored).not.toContain('Corrugated');
  });

  it('salts, so the same password hashes differently twice', async () => {
    const a = await hashPassword('Corrugated7-Harbour');
    const b = await hashPassword('Corrugated7-Harbour');
    expect(a).not.toBe(b);
  });

  it('returns false instead of throwing on a malformed stored hash', async () => {
    await expect(verifyPassword('whatever', 'not-a-valid-hash')).resolves.toBe(false);
  });
});

describe('generateToken', () => {
  it('produces URL-safe tokens', () => {
    expect(generateToken(32)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('does not repeat', () => {
    expect(generateToken(16)).not.toBe(generateToken(16));
  });
});

describe('hashToken', () => {
  it('is deterministic so a stored digest can be compared', async () => {
    const digest = await hashToken('abc');
    expect(await hashToken('abc')).toBe(digest);
    expect(await hashToken('abd')).not.toBe(digest);
  });
});

describe('timingSafeEqual', () => {
  it('compares equal arrays', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
  });

  it('compares different arrays', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
  });

  it('compares different lengths', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });
});

describe('JWT', () => {
  const secret = 'test-secret-that-is-long-enough-for-hs256';
  const options = { ttlSeconds: 900, issuer: 'agently', audience: 'agently-api' };

  const sign = (claims: Record<string, unknown>, ttlSeconds = 900) =>
    signAccessToken(
      { sub: 'user-1', role: 'tenant', email: 'a@b.test', sid: 'session-1', ...claims } as never,
      secret,
      { ...options, ttlSeconds }
    );

  const verify = (token: string, verifyOptions = { issuer: 'agently', audience: 'agently-api' }) =>
    verifyAccessToken(token, secret, verifyOptions);

  it('round-trips a token', async () => {
    const { token } = await sign({ sub: 'user-1', role: 'landlord' });
    const result = await verify(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claims.sub).toBe('user-1');
      expect(result.claims.role).toBe('landlord');
    }
  });

  it('reports the expiry time alongside the token', async () => {
    const { expiresAt } = await sign({});
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects a token signed with a different secret', async () => {
    const { token } = await sign({});
    const result = await verifyAccessToken(token, 'a-different-secret-entirely', {
      issuer: 'agently',
      audience: 'agently-api',
    });
    expect(result).toMatchObject({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a token with a tampered payload', async () => {
    const { token } = await sign({ role: 'tenant' });
    const [header, , signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: 'user-1', role: 'admin', email: 'a@b.test', sid: 'session-1' })
    ).toString('base64url');
    const result = await verify(`${header}.${tamperedPayload}.${signature}`);
    expect(result).toMatchObject({ ok: false, reason: 'bad_signature' });
  });

  it('rejects an expired token', async () => {
    const { token } = await sign({}, -60);
    const result: VerifyResult = await verify(token);
    expect(result).toMatchObject({ ok: false, reason: 'expired' });
  });

  it('rejects a malformed token', async () => {
    expect(await verify('not-a-jwt')).toMatchObject({ ok: false, reason: 'malformed' });
  });

  it('rejects a token issued for another audience', async () => {
    const { token } = await sign({});
    const result = await verify(token, { issuer: 'agently', audience: 'someone-else' });
    expect(result).toMatchObject({ ok: false, reason: 'wrong_audience' });
  });

  it('rejects a token that swaps the algorithm', async () => {
    const { token } = await sign({});
    const [, payload, signature] = token.split('.');
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    expect(await verify(`${noneHeader}.${payload}.${signature}`)).toMatchObject({
      ok: false,
      reason: 'unsupported_algorithm',
    });
  });
});
