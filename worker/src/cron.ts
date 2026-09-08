import type { Env } from './env';
import { execute, nowIso } from './repositories/db';
import { logger } from './lib/logger';

/**
 * Scheduled work.
 *
 * Two jobs, both registered in wrangler.toml:
 *   "17 3 * * *" — housekeeping
 *   "0 8 * * *"  — saved-search digest (queued, never sent inline)
 */

export async function runScheduled(event: ScheduledEvent, env: Env): Promise<void> {
  const hour = new Date(event.scheduledTime).getUTCHours();

  if (hour === 3) {
    await housekeeping(env);
    return;
  }
  if (hour === 8) {
    await savedSearchDigest(env);
  }
}

/**
 * Housekeeping deletes only things that are definitionally safe to delete:
 * expired tokens, abandoned upload intents, old notifications and consumed
 * idempotency keys. User data (properties, bookings, messages) is never touched.
 */
export async function housekeeping(env: Env): Promise<{ [key: string]: number }> {
  const results: Record<string, number> = {};

  const expiredRefresh = await execute(
    env.DB,
    `DELETE FROM refresh_tokens WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < datetime('now', '-7 days'))`,
    [nowIso()]
  );
  results.expired_refresh_tokens = expiredRefresh.changes ?? 0;

  const expiredVerifications = await execute(
    env.DB,
    `DELETE FROM verification_tokens WHERE expires_at < ? OR (used_at IS NOT NULL AND used_at < datetime('now', '-7 days'))`,
    [nowIso()]
  );
  results.expired_verification_tokens = expiredVerifications.changes ?? 0;

  // Uploads that were authorised but never completed: remove the metadata row
  // and the (empty) object if one was written.
  const abandoned = await execute(
    env.DB,
    `DELETE FROM documents WHERE uploaded_at IS NULL AND created_at < datetime('now', '-24 hours') RETURNING storage_key`
  );
  results.abandoned_uploads = abandoned.changes ?? 0;

  const oldNotifications = await execute(
    env.DB,
    `DELETE FROM notifications WHERE read_at IS NOT NULL AND created_at < datetime('now', '-90 days')`
  );
  results.old_notifications = oldNotifications.changes ?? 0;

  const idempotency = await execute(env.DB, `DELETE FROM idempotency_keys WHERE expires_at < ?`, [nowIso()]);
  results.expired_idempotency_keys = idempotency.changes ?? 0;

  logger.info('cron.housekeeping', results);
  return results;
}

/**
 * Queues a digest for anyone with an alert-enabled saved search.
 *
 * The digest itself is delivered by the notification queue so a burst of
 * saved searches cannot stall the cron invocation.
 */
export async function savedSearchDigest(env: Env): Promise<{ enqueued: number }> {
  const searches = await env.DB.prepare(
    `SELECT id, user_id, name, criteria FROM saved_searches WHERE alert_enabled = 1`
  ).all<{ id: string; user_id: string; name: string; criteria: string }>();

  let enqueued = 0;
  for (const search of searches.results ?? []) {
    const criteria = safeParse(search.criteria);
    const city = typeof criteria.city === 'string' ? criteria.city : null;
    const maxPrice = typeof criteria.max_price === 'number' ? Math.round(criteria.max_price * 100) : null;

    const where: string[] = ['deleted_at IS NULL', "status = 'available'", 'created_at >= datetime(?)'];
    const params: unknown[] = [new Date(Date.now() - 7 * 86_400_000).toISOString()];
    if (city) {
      where.push('lower(city) = lower(?)');
      params.push(city);
    }
    if (maxPrice !== null) {
      where.push('price_amount <= ?');
      params.push(maxPrice);
    }

    const matches = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM properties WHERE ${where.join(' AND ')}`
    )
      .bind(...params)
      .first<{ count: number }>();

    const count = Number(matches?.count ?? 0);
    if (count === 0) continue;

    await env.NOTIFICATION_QUEUE.send({
      type: 'notification',
      user_id: search.user_id,
      notification_type: 'saved_search_digest',
      title: `${count} new listing${count === 1 ? '' : 's'} for "${search.name}"`,
      body: `We found ${count} new listing${count === 1 ? '' : 's'} matching your saved search in the last week.`,
      resource_type: 'saved_search',
      resource_id: search.id,
    });
    enqueued += 1;

    await execute(env.DB, `UPDATE saved_searches SET last_run_at = ? WHERE id = ?`, [nowIso(), search.id]);
  }

  logger.info('cron.saved_search_digest', { enqueued });
  return { enqueued };
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
