import type { Env, NotificationJob } from '../env';
import { execute, nowIso, queryOne } from '../repositories/db';
import { logger } from '../lib/logger';

/**
 * Queue consumer for outbound notifications.
 *
 * Work is idempotent where it matters: the in-app row is inserted with a
 * duplicate guard, and email delivery is best-effort with retries handled by
 * the queue itself (failed messages are retried, then dead-lettered).
 */
export async function handleNotificationQueue(
  batch: MessageBatch<NotificationJob>,
  env: Env
): Promise<void> {
  for (const message of batch.messages) {
    try {
      if (message.body.type === 'notification') {
        if (batch.queue === 'agently-notifications-dlq') continue;
        // The row was already written by the request path; nothing to do here
        // beyond acknowledging. Real push/email fan-out happens below.
        await maybeEmail(env, message.body);
      } else {
        await deliverEmail(env, message.body);
      }
      message.ack();
    } catch (error) {
      logger.error('queue.message_failed', {
        attempts: message.attempts,
        error: error instanceof Error ? error.message : String(error),
      });
      // Retry with backoff; after max_retries the message is dropped.
      message.retry({ delaySeconds: Math.min(300, 5 * 2 ** message.attempts) });
    }
  }
}

async function maybeEmail(
  env: Env,
  job: Extract<NotificationJob, { type: 'notification' }>
): Promise<void> {
  if (!env.RESEND_API_KEY) return;

  // Respect a simple per-user digest preference stored in KV. Users who opt out
  // still receive in-app notifications.
  const muted = await env.CACHE.get(`mute:email:${job.user_id}`);
  if (muted === '1') return;

  const recipient = await queryOne<{ email: string }>(env.DB, `SELECT email FROM users WHERE id = ?`, [
    job.user_id,
  ]);
  if (!recipient) return;

  await deliverEmail(env, {
    type: 'email',
    to: recipient.email,
    subject: job.title,
    text: job.body,
    html: `<p>${escapeHtml(job.body)}</p>`,
  });
}

async function deliverEmail(
  env: Env,
  job: Extract<NotificationJob, { type: 'email' }>
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // Without a provider the message is recorded and dropped. This is the
    // documented behaviour of an unconfigured environment — not a silent lie.
    await execute(
      env.DB,
      `INSERT INTO audit_logs (id, actor_id, action, resource_type, resource_id, ip, metadata, created_at)
       VALUES (?, NULL, 'email.skipped_no_provider', 'email', NULL, NULL, ?, ?)`,
      [crypto.randomUUID(), JSON.stringify({ to: job.to, subject: job.subject }), nowIso()]
    );
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? 'Agently <no-reply@agently.app>',
      to: [job.to],
      subject: job.subject,
      text: job.text,
      html: job.html,
    }),
  });

  if (!response.ok && response.status >= 500) {
    // Transient provider failure — let the queue retry.
    throw new Error(`Email provider returned ${response.status}`);
  }
  if (!response.ok) {
    logger.warn('email.rejected', { status: response.status, to: job.to });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
