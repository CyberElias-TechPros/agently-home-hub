// Auth routes: register, login, refresh, logout, verify email, password reset,
// current-user profile + trust/verification state. Runtime-agnostic.

import { ok, created, badRequest, unauthorized, forbidden, notFound, conflict, serverError, parseJson, authTokenFromRequest, currentUser, isEmail } from '../lib/http.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signAccessToken, signRefreshToken, verifyToken, publicUser } from '../lib/jwt.js';
import { randomHex } from '../lib/random.js';
import { sendMail } from '../lib/email.js';
import { all, get, run, withTx, now, newId } from '../db/db.js';
import config from '../config.js';

const VALID_ROLES = ['tenant', 'landlord', 'agent', 'manager'];

function iso(ts) {
  if (!ts) return null;
  if (typeof ts === 'number') return new Date(ts).toISOString();
  return ts;
}

export async function handleAuth(req, res, parts) {
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'register') return register(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'login') return login(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'refresh') return refresh(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'logout') return logout(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'forgot-password') return forgotPassword(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'reset-password') return resetPassword(req, res);
  if (req.method === 'GET' && parts.length === 2 && parts[0] === 'verify') return verifyEmail(req, res, parts[1]);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'me') return me(req, res);
  if (req.method === 'PUT' && parts.length === 1 && parts[0] === 'profile') return updateProfile(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'resend') return resendVerification(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'verify-token') return verifyTokenEndpoint(req, res);
  return notFound(res, 'Auth route not found');
}

async function register(req, res) {
  const body = parseJson(req);
  if (!body) return badRequest(res, 'Invalid JSON body');
  const { name, email, password, role = 'tenant' } = body;

  if (!name || !email || !password) return badRequest(res, 'Name, email and password are required');
  if (!isEmail(email)) return badRequest(res, 'A valid email address is required');
  if (String(password).length < 8) return badRequest(res, 'Password must be at least 8 characters long');
  if (!VALID_ROLES.includes(role)) return badRequest(res, 'Invalid role');

  const lowerEmail = String(email).toLowerCase().trim();

  const exists = await get('SELECT id FROM users WHERE email = ?', [lowerEmail]);
  if (exists) return conflict(res, 'An account with this email already exists');

  const id = newId('usr');
  const password_hash = await hashPassword(String(password));
  const verification_token = randomHex(24);
  const verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await run(
    `INSERT INTO users (id, name, email, password_hash, role, verified, verification_token, verification_expires)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, String(name).trim(), lowerEmail, password_hash, role, verification_token, verification_expires]
  );
  await run(
    `INSERT INTO profiles (user_id) VALUES (?)`,
    [id]
  );

  await sendMail({
    to: lowerEmail,
    subject: 'Verify your Agently account',
    text: `Welcome to Agently! Verify your email: ${config.frontendUrl}/verify-email?token=${verification_token}`,
    html: mailTemplate('Verify your Agently account', `<p>Hi ${String(name).trim()},</p><p>Welcome to Agently! Please confirm your email address to activate your account.</p><p style="text-align:center;margin:24px 0"><a href="${config.frontendUrl}/verify-email?token=${verification_token}" style="background:#0ea5b7;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Verify my email</a></p><p>This link expires in 24 hours.</p>`),
  });

  const token = await signAccessToken({ id, email: lowerEmail, role, name: String(name).trim() }, config);
  const refreshToken = await signRefreshToken({ id }, config);
  await createSession(id, refreshToken);

  const user = await get('SELECT * FROM users WHERE id = ?', [id]);
  return created(res, {
    message: 'Account created. Check your inbox (or the dev mailbox) to verify your email.',
    user: publicUser(user),
    mustVerify: true,
    tokens: { accessToken: token, refreshToken },
  });
}

async function login(req, res) {
  const body = parseJson(req);
  if (!body) return badRequest(res, 'Invalid JSON body');
  const { email, password } = body;
  if (!email || !password) return badRequest(res, 'Email and password are required');

  const lowerEmail = String(email).toLowerCase().trim();
  const user = await get('SELECT * FROM users WHERE email = ?', [lowerEmail]);
  if (!user) return unauthorized(res, 'Invalid email or password');

  const matches = await verifyPassword(String(password), user.password_hash);
  if (!matches) return unauthorized(res, 'Invalid email or password');

  if (user.status === 'suspended') return forbidden(res, 'This account has been suspended');

  const accessToken = await signAccessToken(user, config);
  const refreshToken = await signRefreshToken(user, config);
  await createSession(user.id, refreshToken);
  await run('UPDATE users SET last_login = ? WHERE id = ?', [now(), user.id]);

  return ok(res, {
    message: 'Login successful',
    user: publicUser(user),
    tokens: { accessToken, refreshToken },
  });
}

async function createSession(userId, refreshToken) {
  // Store a hash of the refresh token so DB leaks don't expose usable tokens.
  const hash = await sha256(refreshToken);
  const id = newId('ses');
  const expires_at = new Date(Date.now() + config.jwtRefreshTtlDays * 86400000).toISOString();
  await run(
    `INSERT INTO sessions (id, user_id, refresh_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [id, userId, hash, expires_at]
  );
}

async function refresh(req, res) {
  const body = parseJson(req) || {};
  const { refreshToken } = body;
  if (!refreshToken) return unauthorized(res, 'Refresh token required');

  const payload = await verifyToken(refreshToken, config.jwtRefreshSecret, 'refresh');
  if (!payload) return unauthorized(res, 'Invalid or expired refresh token');

  const hash = await sha256(refreshToken);
  const session = await get(
    'SELECT * FROM sessions WHERE user_id = ? AND refresh_hash = ? AND expires_at > ?',
    [String(payload.sub), hash, now()]
  );
  if (!session) return unauthorized(res, 'Session revoked or expired');

  const user = await get('SELECT * FROM users WHERE id = ?', [String(payload.sub)]);
  if (!user || user.status === 'suspended') return unauthorized(res, 'Account unavailable');

  const accessToken = await signAccessToken(user, config);
  return ok(res, { accessToken });
}

async function logout(req, res) {
  const body = parseJson(req) || {};
  const { refreshToken } = body;
  if (refreshToken) {
    const payload = await verifyToken(refreshToken, config.jwtRefreshSecret, 'refresh');
    if (payload) {
      const hash = await sha256(refreshToken);
      await run('DELETE FROM sessions WHERE user_id = ? AND refresh_hash = ?', [String(payload.sub), hash]);
    }
  }
  return ok(res, { message: 'Logged out' });
}

async function me(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const row = await get('SELECT * FROM users WHERE id = ?', [user.id]);
  if (!row) return unauthorized(res, 'Account not found');
  const profile = await get('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
  return ok(res, {
    user: { ...publicUser(row), profile: profile ? profileView(profile) : null },
  });
}

async function updateProfile(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { name, phone, avatar, bio, company, occupation } = body;

  const upd = [];
  const params = [];
  if (name !== undefined) { upd.push('name = ?'); params.push(String(name).trim()); }
  if (phone !== undefined) { upd.push('phone = ?'); params.push(String(phone).trim() || null); }
  if (avatar !== undefined) { upd.push('avatar_url = ?'); params.push(String(avatar).trim() || null); }
  if (upd.length) {
    upd.push("updated_at = ?");
    params.push(now());
    params.push(user.id);
    await run(`UPDATE users SET ${upd.join(', ')} WHERE id = ?`, params);
  }

  const pupd = [];
  const pparams = [];
  if (bio !== undefined) { pupd.push('bio = ?'); pparams.push(String(bio)); }
  if (company !== undefined) { pupd.push('company = ?'); pparams.push(String(company) || null); }
  if (occupation !== undefined) { pupd.push('occupation = ?'); pparams.push(String(occupation) || null); }
  if (pupd.length) {
    pupd.push('updated_at = ?');
    pparams.push(now());
    pparams.push(user.id);
    await run(`UPDATE profiles SET ${pupd.join(', ')} WHERE user_id = ?`, pparams);
  }

  const row = await get('SELECT * FROM users WHERE id = ?', [user.id]);
  const profile = await get('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
  return ok(res, { user: { ...publicUser(row), profile: profile ? profileView(profile) : null } });
}

async function verifyEmail(req, res, token) {
  if (!token) return badRequest(res, 'Verification token required');
  const row = await get(
    `UPDATE users SET verified = 1, verification_token = NULL, verification_expires = NULL, updated_at = ?
     WHERE verification_token = ? AND verification_expires > ?
     RETURNING *`,
    [now(), token, now()]
  );
  if (!row) return badRequest(res, 'Invalid or expired verification token');
  return ok(res, { message: 'Email verified successfully', user: publicUser(row) });
}

async function resendVerification(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const row = await get('SELECT * FROM users WHERE id = ?', [user.id]);
  if (!row) return notFound(res, 'Account not found');
  if (row.verified) return badRequest(res, 'Email already verified');

  const verification_token = randomHex(24);
  const verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await run(
    'UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?',
    [verification_token, verification_expires, user.id]
  );
  await sendMail({
    to: row.email,
    subject: 'Verify your Agently account',
    text: `Verify your email: ${config.frontendUrl}/verify-email?token=${verification_token}`,
    html: mailTemplate('Verify your Agently account', `<p><a href="${config.frontendUrl}/verify-email?token=${verification_token}" style="background:#0ea5b7;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Verify my email</a></p>`),
  });
  return ok(res, { message: 'Verification email sent' });
}

async function verifyTokenEndpoint(req, res) {
  const body = parseJson(req) || {};
  const { token, type = 'access' } = body;
  if (!token) return badRequest(res, 'Token required');
  const secret = type === 'refresh' ? config.jwtRefreshSecret : config.jwtSecret;
  const payload = await verifyToken(token, secret, type);
  if (!payload) return unauthorized(res, 'Invalid or expired token');
  return ok(res, { valid: true, user: { id: String(payload.sub), role: payload.role } });
}

async function forgotPassword(req, res) {
  const body = parseJson(req) || {};
  const { email } = body;
  if (!email || !isEmail(email)) return badRequest(res, 'A valid email address is required');

  const lowerEmail = String(email).toLowerCase().trim();
  const row = await get('SELECT * FROM users WHERE email = ?', [lowerEmail]);
  // Always return success to avoid account enumeration.
  if (row) {
    const reset_token = randomHex(24);
    const reset_expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await run('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', [reset_token, reset_expires, row.id]);
    await sendMail({
      to: row.email,
      subject: 'Reset your Agently password',
      text: `Reset your password: ${config.frontendUrl}/reset-password?token=${reset_token}`,
      html: mailTemplate('Reset your password', `<p><a href="${config.frontendUrl}/reset-password?token=${reset_token}" style="background:#0ea5b7;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Reset my password</a></p><p>This link expires in 1 hour.</p>`),
    });
  }
  return ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
}

async function resetPassword(req, res) {
  const body = parseJson(req) || {};
  const { token, password } = body;
  if (!token) return badRequest(res, 'Reset token required');
  if (!password || String(password).length < 8) return badRequest(res, 'Password must be at least 8 characters long');

  const row = await get(
    `UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, updated_at = ?
     WHERE reset_token = ? AND reset_expires > ?
     RETURNING id`,
    [await hashPassword(String(password)), now(), token, now()]
  );
  if (!row) return badRequest(res, 'Invalid or expired reset token');

  // Revoke all existing sessions for security.
  await run('DELETE FROM sessions WHERE user_id = ?', [row.id]);
  return ok(res, { message: 'Password reset successfully. Please log in.' });
}

function profileView(p) {
  return {
    bio: p.bio,
    company: p.company,
    occupation: p.occupation,
    trustScore: p.trust_score,
    verifiedStatus: p.verified_status,
  };
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function mailTemplate(title, body) {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f7fbfc;border:1px solid #e3eef1;border-radius:14px">
    <h2 style="color:#0b3b46;margin:0 0 8px">Agently</h2>
    <h3 style="color:#0b3b46;margin:0 0 16px">${title}</h3>
    <div style="color:#33555e;font-size:15px;line-height:1.6">${body}</div>
    <p style="color:#8aa2a9;font-size:12px;margin-top:24px">— The Agently Team</p>
  </div>`;
}
