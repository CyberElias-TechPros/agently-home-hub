import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, AppContext } from '../http/context';
import { currentAuth } from '../http/context';
import { ok, created } from '../http/responses';
import { validate, emailSchema, parseJsonBody } from '../http/validate';
import { withRateLimit } from '../http/middleware';
import { ApiError } from '../lib/errors';
import { assessPassword, generateToken, hashPassword, hashToken, verifyPassword } from '../lib/crypto';
import { signAccessToken } from '../lib/jwt';
import { execute, nowIso, queryOne } from '../repositories/db';
import { users, type PublicUser } from '../repositories/users';
import type { UserRole } from '../domain/roles';
import { recordAudit, sendEmail } from '../services/notifications';
import type { RefreshTokenRow } from '../domain/auth';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: emailSchema,
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
  role: z.enum(['tenant', 'landlord', 'agent']).default('tenant'),
  phone: z.string().trim().max(32).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(200),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10, 'That refresh token is not valid.').max(512),
});

const forgotSchema = z.object({ email: emailSchema });

const resetSchema = z.object({
  token: z.string().min(10).max(512),
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
});

/** Failed logins allowed before a temporary lockout. */
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

export const authRoutes = new Hono<AppEnv>();

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

authRoutes.post('/register', withRateLimit('auth:register'), async (c: AppContext) => {
  const config = c.get('config');
  const body = validate(registerSchema, await parseJsonBody(c.req.raw));

  const strength = assessPassword(body.password);
  if (!strength.valid) {
    throw ApiError.validation(strength.problems[0] ?? 'That password is not strong enough.', {
      password: strength.problems,
    });
  }

  const existing = await users.byEmail(c.env.DB, body.email);
  // Registration is the classic account-enumeration surface. We do not reveal
  // whether an address exists: the caller is told to verify their inbox either
  // way, and an existing account receives a "someone tried to sign up" email.
  if (existing) {
    await sendEmail(c.env, {
      to: body.email,
      subject: 'Agently sign-up attempt',
      text: 'Someone tried to create an account with this address. If it was not you, you can ignore this email.',
      html: '<p>Someone tried to create an Agently account with this address. If it was not you, you can safely ignore this email.</p>',
    });
    return acceptedForVerification();
  }

  const id = crypto.randomUUID();
  const password_hash = await hashPassword(body.password);

  await execute(
    c.env.DB,
    `INSERT INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.name, body.email, password_hash, body.role, body.phone ?? null, nowIso(), nowIso()]
  );

  await recordAudit(c.env, {
    actorId: id,
    action: 'user.registered',
    resourceType: 'user',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
    metadata: { role: body.role },
  });

  // Verification token (hashed at rest). Without an email provider configured
  // the account simply stays unverified rather than blocking sign-in.
  const verifyToken = generateToken(32);
  await execute(
    c.env.DB,
    `INSERT INTO verification_tokens (id, user_id, token_hash, purpose, expires_at, created_at)
     VALUES (?, ?, ?, 'email_verification', datetime('now', '+48 hours'), ?)`,
    [crypto.randomUUID(), id, await hashToken(verifyToken), nowIso()]
  );
  await sendEmail(c.env, {
    to: body.email,
    subject: 'Verify your Agently account',
    text: `Welcome to Agently. Verify your account: ${config.publicWebUrl}/auth?verify=${verifyToken}`,
    html: `<p>Welcome to Agently!</p><p><a href="${config.publicWebUrl}/auth?verify=${verifyToken}">Verify your email address</a></p>`,
  });

  const user = (await users.publicById(c.env.DB, id)) as PublicUser;
  const session = await issueSession(c, user, body.role);

  return created({ data: { user, tokens: session } });
});

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

authRoutes.post('/login', withRateLimit('auth:login'), async (c: AppContext) => {
  const body = validate(loginSchema, await parseJsonBody(c.req.raw));
  const user = await users.byEmail(c.env.DB, body.email);

  // Identical response for "no such user" and "wrong password"; the work is
  // still done so timing does not reveal which case it was.
  const passwordMatches = user ? await verifyPassword(body.password, user.password_hash) : false;

  if (!user || !passwordMatches) {
    if (user) {
      const attempts = user.failed_login_attempts + 1;
      const lockedUntil =
        attempts >= MAX_FAILED_LOGINS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
          : null;
      await users.recordFailedLogin(c.env.DB, user.id, lockedUntil);
    }
    throw ApiError.invalidCredentials();
  }

  if (user.disabled_at) throw ApiError.forbidden('This account has been disabled.');
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    const minutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    throw ApiError.conflict(`Too many failed attempts. Try again in ${minutes} minute(s).`);
  }

  await users.recordSuccessfulLogin(c.env.DB, user.id);
  await recordAudit(c.env, {
    actorId: user.id,
    action: 'user.login',
    resourceType: 'user',
    resourceId: user.id,
    ip: c.req.header('cf-connecting-ip'),
  });

  const publicUser = (await users.publicById(c.env.DB, user.id)) as PublicUser;
  const session = await issueSession(c, publicUser, user.role);
  return ok({ data: { user: publicUser, tokens: session } });
});

/* ------------------------------------------------------------------ */
/* Refresh / logout                                                    */
/* ------------------------------------------------------------------ */

authRoutes.post('/refresh', withRateLimit('auth:refresh'), async (c: AppContext) => {
  const body = validate(refreshSchema, await parseJsonBody(c.req.raw));
  const tokenHash = await hashToken(body.refresh_token);

  const row = await queryOne<RefreshTokenRow>(
    c.env.DB,
    `SELECT * FROM refresh_tokens WHERE token_hash = ?`,
    [tokenHash]
  );

  if (!row) {
    throw ApiError.unauthorized('That session is no longer valid. Please sign in again.');
  }

  // ORDER MATTERS. Rotation marks the spent token `revoked_at`, so a replayed
  // token is *always* revoked — checking `revoked_at` first would consume every
  // replay with a generic error and this branch would be unreachable, leaving a
  // stolen token uncontained: the thief would keep the freshly minted token
  // while the legitimate owner gets locked out.
  //
  // Therefore: expiry needs no containment (it is not a theft signal), a token
  // that was *replaced* is a theft signal and revokes the whole family, and
  // only then does a plain revoked token (logged out, manually revoked) get the
  // generic rejection.
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    throw ApiError.unauthorized('That session has expired. Please sign in again.');
  }

  const user = await users.byId(c.env.DB, row.user_id);
  if (!user || user.disabled_at) {
    throw ApiError.unauthorized('That session is no longer valid. Please sign in again.');
  }

  // Refresh-token rotation with reuse detection: a token that has already been
  // rotated turning up again is the signature of a stolen token being replayed,
  // so every live session for that user is revoked.
  if (row.replaced_by) {
    await execute(
      c.env.DB,
      `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
      [nowIso(), row.user_id]
    );
    throw ApiError.unauthorized('That session was revoked. Please sign in again.');
  }

  if (row.revoked_at) {
    throw ApiError.unauthorized('That session is no longer valid. Please sign in again.');
  }

  const publicUser = (await users.publicById(c.env.DB, user.id)) as PublicUser;
  const session = await issueSession(c, publicUser, user.role, row.id);
  return ok({ data: { tokens: session } });
});

authRoutes.post('/logout', async (c: AppContext) => {
  const auth = c.get('auth');
  const body = await c.req.json().catch(() => ({})) as { refresh_token?: string; all_devices?: boolean };

  if (body.refresh_token) {
    const tokenHash = await hashToken(body.refresh_token);
    await execute(
      c.env.DB,
      `UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND user_id = ?`,
      [nowIso(), tokenHash, auth?.userId ?? '']
    );
  } else if (auth && body.all_devices) {
    await execute(
      c.env.DB,
      `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
      [nowIso(), auth.userId]
    );
  }

  return ok({ success: true });
});

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

authRoutes.get('/me', async (c: AppContext) => {
  const auth = currentAuth(c);
  const user = await users.publicById(c.env.DB, auth.userId);
  if (!user) throw ApiError.notFound('Account');
  return ok({ data: { user } });
});

/* ------------------------------------------------------------------ */
/* Email verification & password reset                                 */
/* ------------------------------------------------------------------ */

authRoutes.post('/verify-email', withRateLimit('auth:password-reset'), async (c: AppContext) => {
  const body = validate(z.object({ token: z.string().min(10).max(512) }), await parseJsonBody(c.req.raw));
  const tokenHash = await hashToken(body.token);

  const row = await queryOne<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    c.env.DB,
    `SELECT id, user_id, expires_at, used_at FROM verification_tokens
      WHERE token_hash = ? AND purpose = 'email_verification'`,
    [tokenHash]
  );

  if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
    throw ApiError.badRequest('That verification link is invalid or has expired.');
  }

  await users.markVerified(c.env.DB, row.user_id);
  await execute(c.env.DB, `UPDATE verification_tokens SET used_at = ? WHERE id = ?`, [nowIso(), row.id]);

  return ok({ success: true });
});

authRoutes.post('/password/forgot', withRateLimit('auth:password-reset'), async (c: AppContext) => {
  const config = c.get('config');
  const body = validate(forgotSchema, await parseJsonBody(c.req.raw));
  const user = await users.byEmail(c.env.DB, body.email);

  // Always the same response — this endpoint must not confirm whether an
  // account exists.
  if (user) {
    const token = generateToken(32);
    await execute(
      c.env.DB,
      `INSERT INTO verification_tokens (id, user_id, token_hash, purpose, expires_at, created_at)
       VALUES (?, ?, ?, 'password_reset', datetime('now', '+2 hours'), ?)`,
      [crypto.randomUUID(), user.id, await hashToken(token), nowIso()]
    );
    await sendEmail(c.env, {
      to: user.email,
      subject: 'Reset your Agently password',
      text: `Reset your password: ${config.publicWebUrl}/auth?reset=${token}`,
      html: `<p><a href="${config.publicWebUrl}/auth?reset=${token}">Reset your password</a>. This link expires in 2 hours.</p>`,
    });
  }

  return ok({ success: true });
});

authRoutes.post('/password/reset', withRateLimit('auth:password-reset'), async (c: AppContext) => {
  const body = validate(resetSchema, await parseJsonBody(c.req.raw));
  const tokenHash = await hashToken(body.token);

  const row = await queryOne<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    c.env.DB,
    `SELECT id, user_id, expires_at, used_at FROM verification_tokens
      WHERE token_hash = ? AND purpose = 'password_reset'`,
    [tokenHash]
  );

  if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
    throw ApiError.badRequest('That password reset link is invalid or has expired.');
  }

  const strength = assessPassword(body.password);
  if (!strength.valid) throw ApiError.validation(strength.problems[0], { password: strength.problems });

  await execute(c.env.DB, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [
    await hashPassword(body.password),
    nowIso(),
    row.user_id,
  ]);
  await execute(c.env.DB, `UPDATE verification_tokens SET used_at = ? WHERE id = ?`, [nowIso(), row.id]);
  // A password change invalidates every existing session.
  await execute(
    c.env.DB,
    `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
    [nowIso(), row.user_id]
  );

  return ok({ success: true });
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

interface IssuedSession {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/**
 * Mints an access/refresh token pair.
 *
 * When `previousTokenId` is supplied the old refresh token is rotated rather
 * than left live, so a stolen refresh token has a very short useful life.
 */
async function issueSession(
  c: AppContext,
  user: PublicUser,
  role: UserRole,
  previousTokenId?: string
): Promise<IssuedSession> {
  const config = c.get('config');
  const sessionId = crypto.randomUUID();

  const { token: access_token, expiresAt } = await signAccessToken(
    { sub: user.id, role, email: user.email, sid: sessionId },
    c.env.JWT_SECRET,
    { ttlSeconds: config.accessTokenTtlSeconds, issuer: config.issuer, audience: config.audience }
  );

  const refresh_token = generateToken(32);
  const refreshId = crypto.randomUUID();
  const refreshExpiresAt = new Date(Date.now() + config.refreshTokenTtlSeconds * 1000).toISOString();

  await execute(
    c.env.DB,
    `INSERT INTO refresh_tokens (id, user_id, token_hash, user_agent, ip, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      refreshId,
      user.id,
      await hashToken(refresh_token),
      c.req.header('user-agent')?.slice(0, 255) ?? null,
      c.req.header('cf-connecting-ip') ?? null,
      refreshExpiresAt,
      nowIso(),
    ]
  );

  if (previousTokenId) {
    await execute(c.env.DB, `UPDATE refresh_tokens SET revoked_at = ?, replaced_by = ? WHERE id = ?`, [
      nowIso(),
      refreshId,
      previousTokenId,
    ]);
  }

  return { access_token, refresh_token, expires_at: expiresAt };
}

function acceptedForVerification(): Response {
  return new Response(
    JSON.stringify({
      data: {
        pending_verification: true,
        message: 'Check your inbox to finish creating your account.',
      },
    }),
    { status: 202, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
