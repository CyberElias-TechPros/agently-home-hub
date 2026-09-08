import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth, requireParam } from '../http/context';
import { created, ok } from '../http/responses';
import { validate, parseJsonBody } from '../http/validate';
import { withRateLimit } from '../http/middleware';
import { ApiError } from '../lib/errors';
import { execute, nowIso, queryAll, queryOne } from '../repositories/db';
import { createNotification } from '../services/notifications';

const startSchema = z.object({
  participant_id: z.string().uuid('Choose someone to message.'),
  property_id: z.string().uuid().optional(),
  content: z.string().trim().min(1, 'Write a message.').max(4000),
});

const sendSchema = z.object({
  content: z.string().trim().min(1, 'Write a message.').max(4000),
});

export const conversationRoutes = new Hono<AppEnv>();

const CONVERSATION_SELECT = `
  SELECT c.id, c.participant_one_id, c.participant_two_id, c.property_id,
         c.last_message_at, c.last_message_preview, c.created_at, c.updated_at,
         u.id AS counterpart_id, u.name AS counterpart_name, u.avatar_url AS counterpart_avatar,
         u.role AS counterpart_role,
         (SELECT COUNT(*) FROM messages m
           WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.read_at IS NULL) AS unread_count
    FROM conversations c
    JOIN users u ON u.id = CASE WHEN c.participant_one_id = ? THEN c.participant_two_id ELSE c.participant_one_id END
`;

conversationRoutes.get('/', async (c: AppContext) => {
  const auth = currentAuth(c);
  const rows = await queryAll<Record<string, unknown>>(
    c.env.DB,
    `${CONVERSATION_SELECT}
      WHERE c.participant_one_id = ? OR c.participant_two_id = ?
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
      LIMIT 100`,
    [auth.userId, auth.userId, auth.userId, auth.userId]
  );

  return ok({ data: rows.map((row) => toConversationDto(row)) });
});

conversationRoutes.post('/', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(startSchema, await parseJsonBody(c.req.raw));

  if (body.participant_id === auth.userId) {
    throw ApiError.badRequest('You cannot start a conversation with yourself.');
  }

  const participant = await queryOne<{ id: string }>(c.env.DB, `SELECT id FROM users WHERE id = ?`, [
    body.participant_id,
  ]);
  if (!participant) throw ApiError.notFound('That user');

  const conversation = await findOrCreateConversation(
    c,
    auth.userId,
    body.participant_id,
    body.property_id ?? null
  );
  const message = await insertMessage(c, conversation.id, auth.userId, body.content);

  return created({
    data: {
      conversation: await loadConversation(c, conversation.id),
      message,
    },
  });
});

conversationRoutes.get('/:id/messages', async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  await assertParticipant(c, id, auth.userId);

  const rows = await queryAll<Record<string, unknown>>(
    c.env.DB,
    `SELECT id, conversation_id, sender_id, content, message_type, read_at, created_at
       FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT 200`,
    [id]
  );

  return ok({ data: rows });
});

conversationRoutes.post('/:id/messages', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const body = validate(sendSchema, await parseJsonBody(c.req.raw));

  const conversation = await assertParticipant(c, id, auth.userId);
  const message = await insertMessage(c, id, auth.userId, body.content);

  const recipientId =
    conversation.participant_one_id === auth.userId
      ? conversation.participant_two_id
      : conversation.participant_one_id;

  await createNotification(c.env, {
    userId: recipientId,
    type: 'message_received',
    title: 'New message',
    body: body.content.slice(0, 120),
    resourceType: 'conversation',
    resourceId: id,
  });

  return created({ data: message });
});

/** Marks everything from the *other* person as read. */
conversationRoutes.post('/:id/read', async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  await assertParticipant(c, id, auth.userId);

  await execute(
    c.env.DB,
    `UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id <> ? AND read_at IS NULL`,
    [nowIso(), id, auth.userId]
  );

  return ok({ success: true });
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

interface ConversationRow {
  id: string;
  participant_one_id: string;
  participant_two_id: string;
  property_id: string | null;
}

async function findOrCreateConversation(
  c: AppContext,
  userId: string,
  participantId: string,
  propertyId: string | null
): Promise<ConversationRow> {
  // Stored with a deterministic ordering so the unique index can guarantee one
  // conversation per pair regardless of who starts it.
  const [one, two] = userId < participantId ? [userId, participantId] : [participantId, userId];

  const existing = await queryOne<ConversationRow>(
    c.env.DB,
    `SELECT id, participant_one_id, participant_two_id, property_id FROM conversations
      WHERE participant_one_id = ? AND participant_two_id = ?
        AND COALESCE(property_id, '') = COALESCE(?, '')`,
    [one, two, propertyId]
  );
  if (existing) return existing;

  const id = crypto.randomUUID();
  await execute(
    c.env.DB,
    `INSERT INTO conversations (id, participant_one_id, participant_two_id, property_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, one, two, propertyId, nowIso(), nowIso()]
  );
  return { id, participant_one_id: one, participant_two_id: two, property_id: propertyId };
}

async function insertMessage(c: AppContext, conversationId: string, senderId: string, content: string) {
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  await execute(
    c.env.DB,
    `INSERT INTO messages (id, conversation_id, sender_id, content, message_type, created_at)
     VALUES (?, ?, ?, ?, 'text', ?)`,
    [id, conversationId, senderId, content, createdAt]
  );
  await execute(
    c.env.DB,
    `UPDATE conversations SET last_message_at = ?, last_message_preview = ?, updated_at = ? WHERE id = ?`,
    [createdAt, content.slice(0, 140), createdAt, conversationId]
  );

  // Let any open socket in this conversation refresh immediately.
  try {
    const hub = c.env.REALTIME_HUB.get(c.env.REALTIME_HUB.idFromName(conversationId));
    await hub.fetch('https://realtime/broadcast', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, message_id: id }),
    });
  } catch {
    // Real-time fan-out is best-effort; the message is already persisted.
  }

  return { id, conversation_id: conversationId, sender_id: senderId, content, message_type: 'text' as const, read_at: null, created_at: createdAt };
}

async function loadConversation(c: AppContext, id: string) {
  const auth = currentAuth(c);
  const row = await queryOne<Record<string, unknown>>(
    c.env.DB,
    `${CONVERSATION_SELECT} WHERE c.id = ?`,
    [auth.userId, auth.userId, id]
  );
  return row ? toConversationDto(row) : null;
}

async function assertParticipant(c: AppContext, conversationId: string, userId: string): Promise<ConversationRow> {
  const row = await queryOne<ConversationRow>(
    c.env.DB,
    `SELECT id, participant_one_id, participant_two_id, property_id FROM conversations WHERE id = ?`,
    [conversationId]
  );
  if (!row) throw ApiError.notFound('That conversation');
  if (row.participant_one_id !== userId && row.participant_two_id !== userId) {
    // 404 rather than 403: existence of a conversation is itself private.
    throw ApiError.notFound('That conversation');
  }
  return row;
}

function toConversationDto(row: Record<string, unknown>) {
  return {
    id: row.id,
    participant_one_id: row.participant_one_id,
    participant_two_id: row.participant_two_id,
    property_id: row.property_id ?? null,
    last_message_at: row.last_message_at ?? null,
    last_message_preview: row.last_message_preview ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    unread_count: Number(row.unread_count ?? 0),
    counterpart: row.counterpart_id
      ? {
          id: row.counterpart_id,
          name: row.counterpart_name,
          avatar_url: row.counterpart_avatar ?? null,
          role: row.counterpart_role,
        }
      : null,
  };
}
