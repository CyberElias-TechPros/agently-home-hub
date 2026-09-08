import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth } from '../http/context';
import { ok } from '../http/responses';
import { validate, parseJsonBody } from '../http/validate';
import { execute, nowIso, queryAll, queryOne } from '../repositories/db';
import { users } from '../repositories/users';
import { verifyPassword } from '../lib/crypto';
import { hashPassword, assessPassword } from '../lib/crypto';
import { ApiError } from '../lib/errors';
import { properties } from '../repositories/properties';
import { toPropertyDto } from '../domain/property';
import { toBookingDto, type BookingRow } from '../domain/booking';
import { recordAudit } from '../services/notifications';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120).optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  avatar_url: z.string().url('Enter a valid image URL.').nullable().optional(),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Enter your current password.'),
  new_password: z.string().min(10, 'Use at least 10 characters.').max(200),
});

export const profileRoutes = new Hono<AppEnv>();

profileRoutes.get('/', async (c: AppContext) => {
  const auth = currentAuth(c);
  const user = await users.publicById(c.env.DB, auth.userId);
  if (!user) throw ApiError.notFound('Account');
  return ok({ data: { user } });
});

profileRoutes.patch('/', async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(profileSchema, await parseJsonBody(c.req.raw));
  await users.updateProfile(c.env.DB, auth.userId, {
    name: body.name,
    phone: body.phone,
    avatar_url: body.avatar_url,
  });
  const user = await users.publicById(c.env.DB, auth.userId);
  return ok({ data: { user } });
});

profileRoutes.post('/password', async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(changePasswordSchema, await parseJsonBody(c.req.raw));

  const user = await users.byId(c.env.DB, auth.userId);
  if (!user) throw ApiError.notFound('Account');

  if (!(await verifyPassword(body.current_password, user.password_hash))) {
    throw ApiError.validation('Your current password is incorrect.', {
      current_password: ['This does not match your current password.'],
    });
  }

  const strength = assessPassword(body.new_password);
  if (!strength.valid) throw ApiError.validation(strength.problems[0], { new_password: strength.problems });

  await execute(c.env.DB, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [
    await hashPassword(body.new_password),
    nowIso(),
    auth.userId,
  ]);
  // Keep the current device signed in; revoke everything else.
  await execute(
    c.env.DB,
    `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND id <> ?`,
    [nowIso(), auth.userId, auth.sessionId]
  );

  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'user.password_changed',
    resourceType: 'user',
    resourceId: auth.userId,
    ip: c.req.header('cf-connecting-ip'),
  });

  return ok({ success: true });
});

/** Everything the signed-in user needs for their dashboard, in one round trip. */
profileRoutes.get('/summary', async (c: AppContext) => {
  const auth = currentAuth(c);

  const [activeBookings, openMaintenance, unreadNotifications, myProperties] = await Promise.all([
    queryAll<BookingRow>(
      c.env.DB,
      `SELECT b.*, p.title AS property_title, p.address_line1 AS property_address, p.city AS property_city,
              t.name AS tenant_name, l.name AS landlord_name
         FROM bookings b
         JOIN properties p ON p.id = b.property_id
         JOIN users t ON t.id = b.tenant_id
         JOIN users l ON l.id = b.landlord_id
        WHERE (b.tenant_id = ? OR b.landlord_id = ?) AND b.status IN ('pending', 'approved')
        ORDER BY b.created_at DESC
        LIMIT 10`,
      [auth.userId, auth.userId]
    ),
    queryOne<{ count: number }>(
      c.env.DB,
      `SELECT COUNT(*) as count FROM maintenance_requests
        WHERE (tenant_id = ? OR landlord_id = ?) AND status IN ('pending', 'assigned', 'in_progress')`,
      [auth.userId, auth.userId]
    ),
    queryOne<{ count: number }>(
      c.env.DB,
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL`,
      [auth.userId]
    ),
    auth.role === 'tenant' ? Promise.resolve([]) : properties.listByLandlord(c.env.DB, auth.userId),
  ]);

  return ok({
    data: {
      active_bookings: activeBookings.map(toBookingDto),
      open_maintenance_requests: Number(openMaintenance?.count ?? 0),
      unread_notifications: Number(unreadNotifications?.count ?? 0),
      my_properties: myProperties.map(toPropertyDto),
    },
  });
});
