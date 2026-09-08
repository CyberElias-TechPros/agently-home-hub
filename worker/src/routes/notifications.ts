import { Hono } from 'hono';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth, requireParam } from '../http/context';
import { ok } from '../http/responses';
import { execute, nowIso, queryOne } from '../repositories/db';
import { listNotifications } from '../services/notifications';
import { ApiError } from '../lib/errors';

export const notificationRoutes = new Hono<AppEnv>();

notificationRoutes.get('/', async (c: AppContext) => {
  const auth = currentAuth(c);
  const rows = await listNotifications(c.env.DB, auth.userId);
  return ok({ data: rows });
});

notificationRoutes.get('/unread-count', async (c: AppContext) => {
  const auth = currentAuth(c);
  const row = await queryOne<{ count: number }>(
    c.env.DB,
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL`,
    [auth.userId]
  );
  return ok({ data: { count: Number(row?.count ?? 0) } });
});

notificationRoutes.post('/read-all', async (c: AppContext) => {
  const auth = currentAuth(c);
  await execute(
    c.env.DB,
    `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`,
    [nowIso(), auth.userId]
  );
  return ok({ success: true });
});

notificationRoutes.post('/:id/read', async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const result = await execute(
    c.env.DB,
    `UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?`,
    [nowIso(), id, auth.userId]
  );
  if ((result.changes ?? 0) === 0) throw ApiError.notFound('That notification');
  return ok({ success: true });
});
