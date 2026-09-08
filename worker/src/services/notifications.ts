import { execute, nowIso, queryAll, queryOne } from '../repositories/db';
import type { Env } from '../env';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
}

/**
 * Creates an in-app notification and hands delivery (email/push) to the queue
 * so the request that triggered it is never blocked by a third-party call.
 *
 * A duplicate within the same minute for the same user/type/resource is
 * suppressed — double-clicking a button should not produce two alerts.
 */
export async function createNotification(env: Env, input: CreateNotificationInput): Promise<string | null> {
  const id = crypto.randomUUID();

  const duplicate = await queryOne<{ id: string }>(
    env.DB,
    `SELECT id FROM notifications
      WHERE user_id = ? AND type = ? AND COALESCE(resource_id, '') = COALESCE(?, '')
        AND created_at > datetime('now', '-1 minute')`,
    [input.userId, input.type, input.resourceId ?? null]
  );
  if (duplicate) return null;

  await execute(
    env.DB,
    `INSERT INTO notifications (id, user_id, type, title, body, resource_type, resource_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.type,
      input.title,
      input.body ?? null,
      input.resourceType ?? null,
      input.resourceId ?? null,
      nowIso(),
    ]
  );

  await env.NOTIFICATION_QUEUE.send({
    type: 'notification',
    user_id: input.userId,
    notification_type: input.type,
    title: input.title,
    body: input.body ?? '',
    resource_type: input.resourceType ?? undefined,
    resource_id: input.resourceId ?? undefined,
  });

  return id;
}

export async function sendEmail(
  env: Env,
  input: { to: string; subject: string; html: string; text: string }
): Promise<void> {
  // Email is queued rather than sent inline: the provider may be slow or down
  // and the user should not have to wait for it.
  await env.NOTIFICATION_QUEUE.send({ type: 'email', ...input });
}

export interface AuditInput {
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}

/** Append-only operational trail for privileged actions. */
export async function recordAudit(env: Env, input: AuditInput): Promise<void> {
  await execute(
    env.DB,
    `INSERT INTO audit_logs (id, actor_id, action, resource_type, resource_id, ip, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      input.actorId,
      input.action,
      input.resourceType,
      input.resourceId ?? null,
      input.ip ?? null,
      JSON.stringify(input.metadata ?? {}),
      nowIso(),
    ]
  );
}

export function listNotifications(db: D1Database, userId: string, limit = 50) {
  return queryAll(
    db,
    `SELECT id, user_id, type, title, body, resource_type, resource_id, read_at, created_at
       FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
    [userId, limit]
  );
}
