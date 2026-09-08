import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth, requireRole, requireParam } from '../http/context';
import { ok, noContent } from '../http/responses';
import { validate, parseJsonBody, paginationSchema, validateQuery } from '../http/validate';
import { withRateLimit } from '../http/middleware';
import { ApiError } from '../lib/errors';
import { execute, nowIso, queryAll, queryOne } from '../repositories/db';
import { users, type AdminUserRow, type UserRow } from '../repositories/users';
import { properties } from '../repositories/properties';
import { ROLES } from '../domain/roles';
import { recordAudit } from '../services/notifications';

/**
 * Platform administration.
 *
 * Everything here is role-gated *and* audited. The last two guards exist
 * because the obvious failure mode of an admin surface is self-lockout and
 * privilege escalation.
 */

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('*', requireRole('admin'));

adminRoutes.get('/analytics', async (c: AppContext) => {
  const [totalUsers, usersByRole, propertyCounts, bookingsByStatus, openMaintenance, newUsers] = await Promise.all([
    users.countAll(c.env.DB),
    users.countByRole(c.env.DB),
    properties.countByStatus(c.env.DB),
    countBy(c.env.DB, 'bookings', 'status'),
    queryOne<{ count: number }>(
      c.env.DB,
      `SELECT COUNT(*) as count FROM maintenance_requests WHERE status IN ('pending', 'assigned', 'in_progress')`
    ),
    users.countSince(c.env.DB, new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ]);

  return ok({
    data: {
      total_users: Number(totalUsers?.count ?? 0),
      total_properties: Object.values(propertyCounts).reduce((sum, value) => sum + value, 0),
      total_bookings: Object.values(bookingsByStatus).reduce((sum, value) => sum + value, 0),
      open_maintenance_requests: Number(openMaintenance?.count ?? 0),
      new_users_last_30_days: Number(newUsers?.count ?? 0),
      users_by_role: usersByRole,
      properties_by_status: propertyCounts,
      bookings_by_status: bookingsByStatus,
      generated_at: nowIso(),
    },
  });
});

adminRoutes.get('/users', async (c: AppContext) => {
  const query = validateQuery(
    paginationSchema.extend({
      role: z.enum(ROLES as [string, ...string[]]).optional(),
      q: z.string().trim().max(120).optional(),
    }),
    new URL(c.req.url).searchParams
  );

  const [rows, totalRow] = await Promise.all([
    users.adminList(c.env.DB, {
      role: query.role,
      q: query.q,
      limit: query.per_page,
      offset: (query.page - 1) * query.per_page,
    }),
    users.count(c.env.DB, { role: query.role, q: query.q }),
  ]);

  const total = Number(totalRow?.count ?? 0);
  return ok({
    data: rows.map(toAdminUserDto),
    pagination: {
      page: query.page,
      per_page: query.per_page,
      total,
      total_pages: Math.max(1, Math.ceil(total / query.per_page)),
    },
  });
});

adminRoutes.patch('/users/:id/role', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const body = validate(z.object({ role: z.enum(ROLES as [string, ...string[]]) }), await parseJsonBody(c.req.raw));

  const target = await queryOne<UserRow>(c.env.DB, `SELECT * FROM users WHERE id = ?`, [id]);
  if (!target) throw ApiError.notFound('That user');

  // Guard: an admin cannot demote themselves. Without this, the platform can
  // end up with zero administrators and no way back in.
  if (target.id === auth.userId && body.role !== 'admin') {
    throw ApiError.conflict('You cannot remove your own administrator access. Ask another admin to do it.');
  }

  await users.setRole(c.env.DB, id, body.role as UserRow['role']);
  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'user.role_changed',
    resourceType: 'user',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
    metadata: { from: target.role, to: body.role },
  });

  const updated = await queryOne<AdminUserRow>(c.env.DB, `SELECT * FROM users WHERE id = ?`, [id]);
  return ok({ data: updated ? toAdminUserDto(updated) : null });
});

adminRoutes.patch('/users/:id/disabled', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const body = validate(z.object({ disabled: z.boolean() }), await parseJsonBody(c.req.raw));

  const target = await queryOne<UserRow>(c.env.DB, `SELECT * FROM users WHERE id = ?`, [id]);
  if (!target) throw ApiError.notFound('That user');
  if (target.id === auth.userId && body.disabled) {
    throw ApiError.conflict('You cannot disable your own account.');
  }

  await users.setDisabled(c.env.DB, id, body.disabled);
  if (body.disabled) {
    // Disabling must take effect immediately, not when tokens expire.
    await execute(
      c.env.DB,
      `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
      [nowIso(), id]
    );
  }

  await recordAudit(c.env, {
    actorId: auth.userId,
    action: body.disabled ? 'user.disabled' : 'user.enabled',
    resourceType: 'user',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
  });

  return ok({ data: { id, disabled: body.disabled } });
});

adminRoutes.get('/audit-logs', async (c: AppContext) => {
  const query = validateQuery(
    paginationSchema.extend({ action: z.string().trim().max(60).optional() }),
    new URL(c.req.url).searchParams
  );

  const where = query.action ? 'WHERE action = ?' : '';
  const params: unknown[] = query.action ? [query.action] : [];
  const rows = await queryAll<Record<string, unknown>>(
    c.env.DB,
    `SELECT a.*, u.name AS actor_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ${where}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, query.per_page, (query.page - 1) * query.per_page]
  );
  return ok({ data: rows });
});

/** Takedown path for listings that break the rules. */
adminRoutes.delete('/properties/:id', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const property = await properties.byId(c.env.DB, id);
  if (!property) throw ApiError.notFound('That listing');

  await execute(c.env.DB, `UPDATE properties SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    nowIso(),
    nowIso(),
    id,
  ]);
  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'property.removed_by_admin',
    resourceType: 'property',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
  });

  return noContent();
});

async function countBy(db: D1Database, table: string, column: string): Promise<Record<string, number>> {
  const rows = await queryAll<{ key: string; count: number }>(
    db,
    `SELECT ${column} AS key, COUNT(*) AS count FROM ${table} GROUP BY ${column}`
  );
  return Object.fromEntries(rows.map((row) => [row.key, row.count]));
}

function toAdminUserDto(row: AdminUserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    avatar_url: row.avatar_url,
    verified: row.verified === 1,
    last_login_at: row.last_login_at,
    disabled_at: row.disabled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
