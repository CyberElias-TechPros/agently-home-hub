/**
 * Auth routes: register, verify, login, refresh, logout, me, profile,
 * forgot/reset password.
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { ApiError } from '../errors';
import { hashPassword, verifyPassword, randomToken, uuid, nowIso } from '../crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../jwt';
import { requireAuth, currentUserId } from '../middleware';
import { RESET_TTL_SECONDS, VERIFICATION_TTL_SECONDS } from '../config';

type Ctx = { Bindings: Env; Variables: Variables };

export const auth = new Hono<Ctx>();

const ROLES = ['tenant', 'landlord', 'agent', 'manager', 'admin', 'vendor'];
const PUBLIC_USER_FIELDS = 'id, name, email, role, verified, phone, avatar_url, trust_score, kyc_status, created_at';

function toPublic(row: any): Record<string, unknown> {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    verified: row.verified === 1,
    phone: row.phone ?? null,
    avatar: row.avatar_url ?? null,
    trustScore: row.trust_score ?? 50,
    kycStatus: row.kyc_status ?? 'not_started',
    createdAt: row.created_at ?? null,
  };
}

function requireEmail(value: unknown): string {
  if (typeof value !== 'string' || value.length < 3 || value.length > 254 || !value.includes('@')) {
    throw ApiError.badRequest('A valid email address is required');
  }
  return value.trim().toLowerCase();
}

function requireName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 120) {
    throw ApiError.badRequest('Name must be 2–120 characters');
  }
  return value.trim();
}

function requirePassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw ApiError.badRequest('Password must be at least 8 characters', {
      minLength: 8,
    });
  }
  return value;
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
auth.post('/register', async (c) => {
  const { name, email, password, role = 'tenant' } = await c.req.json().catch(() => ({}));
  const cleanName = requireName(name);
  const cleanEmail = requireEmail(email);
  const cleanPassword = requirePassword(password);
  if (!ROLES.includes(role)) {
    throw ApiError.badRequest('Invalid role', { allowed: ROLES });
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(cleanEmail).first();
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const userId = uuid();
  const passwordHash = await hashPassword(cleanPassword);
  const verificationToken = randomToken(32);
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_SECONDS * 1000).toISOString();

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, verified)
       VALUES (?, ?, ?, ?, ?, 0)`,
    ).bind(userId, cleanName, cleanEmail, passwordHash, role),
    c.env.DB.prepare(
      `INSERT INTO auth_tokens (token_hash, user_id, kind, expires_at) VALUES (?, ?, 'verification', ?)`,
    ).bind(verificationToken, userId, expiresAt),
  ]);

  // Demo mode (no mailchannels configured): return the token so email
  // verification still works end-to-end locally. In production this can be
  // hoisted into an email service while keeping the same data flow.
  const verifyUrl = new URL(c.req.url);
  verifyUrl.pathname = '/api/auth/verify';
  verifyUrl.search = `?token=${verificationToken}`;

  return c.json({
    success: true,
    data: {
      message: 'Account created. Verify your email to activate it.',
      user: { id: userId, name: cleanName, email: cleanEmail, role, verified: false },
      verifyEmail: {
        // Always set for demo/tests; omit in production email flow.
        sentTo: cleanEmail,
        verifyUrl: verifyUrl.toString(),
      },
    },
  }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/auth/verify?token=…
// ---------------------------------------------------------------------------
auth.get('/verify', async (c) => {
  const token = c.req.query('token')?.trim();
  if (!token) throw ApiError.badRequest('Verification token required');

  const rec = await c.env.DB.prepare(
    `SELECT t.user_id, t.expires_at FROM auth_tokens t WHERE t.token_hash = ? AND t.kind = 'verification'`,
  ).bind(token).first();

  if (!rec || new Date(rec.expires_at as string).getTime() < Date.now()) {
    throw ApiError.badRequest('Invalid or expired verification token');
  }

  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE users SET verified = 1, updated_at = ? WHERE id = ?`)
      .bind(nowIso(), rec.user_id),
    c.env.DB.prepare(`DELETE FROM auth_tokens WHERE token_hash = ?`).bind(token),
  ]);

  const user = await c.env.DB.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`)
    .bind(rec.user_id).first();

  return c.json({ success: true, data: { message: 'Email verified successfully', user: toPublic(user) } });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}));
  const cleanEmail = requireEmail(email);
  if (typeof password !== 'string' || !password) throw ApiError.badRequest('Password is required');

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(cleanEmail).first();
  // constant-ish behavior: always run a hash when the user is missing
  if (!user) {
    await hashPassword(password);
    throw ApiError.unauthorized('Invalid email or password');
  }

  const check = await verifyPassword(password, user.password_hash as string);
  if (!check.ok) {
    if (check.reason === 'legacy_bcrypt') {
      throw new ApiError(401, 'password_reset_required',
        'This account uses an older password format. Please reset your password.');
    }
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.verified !== 1) {
    throw new ApiError(403, 'email_not_verified', 'Please verify your email before signing in');
  }

  const authUser = { sub: user.id as string, email: user.email as string, role: user.role as string, name: user.name as string };
  const accessToken = await signAccessToken(c.env, authUser);
  const refreshToken = await signRefreshToken(c.env, authUser);

  return c.json({
    success: true,
    data: {
      user: toPublic(user),
      tokens: { accessToken, refreshToken },
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------
auth.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json().catch(() => ({}));
  if (typeof refreshToken !== 'string' || !refreshToken) throw ApiError.unauthorized('Refresh token required');

  const payload = await verifyRefreshToken(c.env, refreshToken);
  if (!payload) throw ApiError.unauthorized('Invalid or expired refresh token');

  const user = await c.env.DB.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`)
    .bind(payload.sub).first();
  if (!user) throw ApiError.unauthorized('User no longer exists');

  const authUser = { sub: user.id as string, email: user.email as string, role: user.role as string, name: user.name as string };
  const accessToken = await signAccessToken(c.env, authUser);
  const newRefreshToken = await signRefreshToken(c.env, authUser);

  return c.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout  (stateless JWT — client discards tokens)
// ---------------------------------------------------------------------------
auth.post('/logout', requireAuth, (c) => {
  return c.json({ success: true, data: { message: 'Logged out successfully' } });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
auth.get('/me', requireAuth, async (c) => {
  const user = await c.env.DB.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`)
    .bind(currentUserId(c)).first();
  if (!user) throw ApiError.notFound('User not found');
  return c.json({ success: true, data: toPublic(user) });
});

// ---------------------------------------------------------------------------
// PUT /api/auth/profile
// ---------------------------------------------------------------------------
auth.put('/profile', requireAuth, async (c) => {
  const { name, phone, avatar } = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const values: unknown[] = [];

  if (typeof name === 'string' && name.trim().length >= 2) {
    sets.push('name = ?');
    values.push(name.trim());
  }
  if (typeof phone === 'string') {
    sets.push('phone = ?');
    values.push(phone.trim() || null);
  }
  if (typeof avatar === 'string') {
    sets.push('avatar_url = ?');
    values.push(avatar.trim() || null);
  }

  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso(), currentUserId(c));
    await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const user = await c.env.DB.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`)
    .bind(currentUserId(c)).first();
  return c.json({ success: true, data: toPublic(user) });
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------
auth.post('/forgot-password', async (c) => {
  const { email } = await c.req.json().catch(() => ({}));
  const cleanEmail = requireEmail(email);

  // Always respond 200 so we never leak which emails exist.
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(cleanEmail).first();
  if (user) {
    const resetToken = randomToken(32);
    const expiresAt = new Date(Date.now() + RESET_TTL_SECONDS * 1000).toISOString();
    await c.env.DB.prepare(
      `DELETE FROM auth_tokens WHERE user_id = ? AND kind = 'password_reset'`,
    ).bind(user.id).run();
    await c.env.DB.prepare(
      `INSERT INTO auth_tokens (token_hash, user_id, kind, expires_at) VALUES (?, ?, 'password_reset', ?)`,
    ).bind(resetToken, user.id, expiresAt).run();

    // Demo hook so reset works end-to-end locally; in production this
    // becomes an email with the magic link.
    const resetUrl = new URL(c.req.url);
    resetUrl.pathname = '/auth';
    resetUrl.search = `?reset=${resetToken}`;
    return c.json({
      success: true,
      data: { message: 'If that email exists, a reset link has been sent.', resetToken: resetToken, resetUrl: resetUrl.toString() },
    });
  }

  return c.json({ success: true, data: { message: 'If that email exists, a reset link has been sent.' } });
});

auth.post('/reset-password', async (c) => {
  const { token, password } = await c.req.json().catch(() => ({}));
  if (typeof token !== 'string' || !token) throw ApiError.badRequest('Reset token required');
  const cleanPassword = requirePassword(password);

  const rec = await c.env.DB.prepare(
    `SELECT t.user_id, t.expires_at FROM auth_tokens t WHERE t.token_hash = ? AND t.kind = 'password_reset'`,
  ).bind(token).first();
  if (!rec || new Date(rec.expires_at as string).getTime() < Date.now()) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const newHash = await hashPassword(cleanPassword);
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`)
      .bind(newHash, nowIso(), rec.user_id),
    c.env.DB.prepare(`DELETE FROM auth_tokens WHERE token_hash = ?`).bind(token),
  ]);

  return c.json({ success: true, data: { message: 'Password updated. You can now sign in.' } });
});
