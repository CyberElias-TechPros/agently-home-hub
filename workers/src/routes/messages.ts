/**
 * Messaging: conversations + messages + read receipts, and notifications.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env, Variables } from '../types';
import { ApiError } from '../errors';
import { uuid, nowIso } from '../crypto';
import { requireAuth, currentUserId } from '../middleware';

type Ctx = { Bindings: Env; Variables: Variables };
type AppContext = Context<Ctx>;

export const messages = new Hono<Ctx>();

const KINDS = ['text', 'image', 'file', 'system'];

function toMessage(row: any): Record<string, unknown> {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.body,
    kind: row.kind,
    fileUrl: row.file_url ?? null,
    createdAt: row.created_at,
  };
}

function toConversation(row: any, userId: string): Record<string, unknown> {
  return {
    id: row.id,
    participant: userId === row.user_a_id
      ? { id: row.user_b_id, name: row.b_name, avatar: row.b_avatar, role: row.b_role }
      : { id: row.user_a_id, name: row.a_name, avatar: row.a_avatar, role: row.a_role },
    propertyId: row.property_id ?? null,
    lastMessage: row.last_body ?? null,
    lastMessageAt: row.last_at ?? row.updated_at,
    unreadCount: row.unread_count ?? 0,
    archived: (userId === row.user_a_id ? row.archived_a : row.archived_b) === 1,
  };
}

async function getConversation(c: AppContext, conversationId: string, userId: string): Promise<any> {
  const row = await c.env.DB.prepare(
    `SELECT c.*, a.name AS a_name, a.avatar_url AS a_avatar, a.role AS a_role,
            b.name AS b_name, b.avatar_url AS b_avatar, b.role AS b_role
     FROM conversations c
     JOIN users a ON a.id = c.user_a_id
     JOIN users b ON b.id = c.user_b_id
     WHERE c.id = ?`,
  ).bind(conversationId).first();
  if (!row) throw ApiError.notFound('Conversation not found');
  if (row.user_a_id !== userId && row.user_b_id !== userId) throw ApiError.forbidden('Forbidden');
  return row;
}

// ---------------------------------------------------------------------------
// GET /api/messages/conversations
// ---------------------------------------------------------------------------
messages.get('/conversations', requireAuth, async (c) => {
  const userId = currentUserId(c);
  const rows = await c.env.DB.prepare(
    `SELECT c.*, a.name AS a_name, a.avatar_url AS a_avatar, a.role AS a_role,
            b.name AS b_name, b.avatar_url AS b_avatar, b.role AS b_role,
            (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
            (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_at,
            (SELECT COUNT(*) FROM messages m
               WHERE m.conversation_id = c.id AND m.sender_id <> ?
                 AND m.created_at > COALESCE((SELECT last_read_at FROM message_reads mr WHERE mr.conversation_id = c.id AND mr.user_id = ?), '')) AS unread_count
     FROM conversations c
     JOIN users a ON a.id = c.user_a_id
     JOIN users b ON b.id = c.user_b_id
     WHERE c.user_a_id = ? OR c.user_b_id = ?
     ORDER BY last_at DESC`,
  ).bind(userId, userId, userId, userId).all();

  return c.json({ success: true, data: rows.results.map((r) => toConversation(r, userId)) });
});

// ---------------------------------------------------------------------------
// POST /api/messages/conversations  (start or resume a thread)
// ---------------------------------------------------------------------------
messages.post('/conversations', requireAuth, async (c) => {
  const userId = currentUserId(c);
  const body = await c.req.json().catch(() => ({}));
  const { participantId, propertyId = null } = body;
  if (!participantId) throw ApiError.badRequest('participantId is required');
  if (participantId === userId) throw ApiError.badRequest('Cannot message yourself');

  const other = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(participantId).first();
  if (!other) throw ApiError.notFound('User not found');

  const existing = await c.env.DB.prepare(
    `SELECT * FROM conversations WHERE user_a_id = ? AND user_b_id = ? AND COALESCE(property_id, '') = COALESCE(?, '')`,
  ).bind(userId, participantId, propertyId).first();
  if (existing) {
    const full = await getConversation(c, existing.id as string, userId);
    return c.json({ success: true, data: toConversation(full, userId) });
  }

  const convId = uuid();
  await c.env.DB.prepare(
    `INSERT INTO conversations (id, user_a_id, user_b_id, property_id) VALUES (?, ?, ?, ?)`,
  ).bind(convId, userId, participantId, propertyId).run();

  const full = await getConversation(c, convId, userId);
  return c.json({ success: true, data: toConversation(full, userId) }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/messages/conversations/:id/messages
// ---------------------------------------------------------------------------
messages.get('/conversations/:id/messages', requireAuth, async (c) => {
  const userId = currentUserId(c);
  const conversationId = c.req.param('id');
  await getConversation(c, conversationId, userId);

  const rows = await c.env.DB.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
  ).bind(conversationId).all();

  // mark read
  await c.env.DB.prepare(
    `INSERT INTO message_reads (user_id, conversation_id, last_read_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id, conversation_id) DO UPDATE SET last_read_at = excluded.last_read_at`,
  ).bind(userId, conversationId, nowIso()).run();

  return c.json({ success: true, data: rows.results.map(toMessage) });
});

// ---------------------------------------------------------------------------
// POST /api/messages  (send into an existing conversation)
// ---------------------------------------------------------------------------
messages.post('/', requireAuth, async (c) => {
  const userId = currentUserId(c);
  const body = await c.req.json().catch(() => ({}));
  const { conversationId, receiverId, content, kind = 'text', propertyId = null, fileUrl = null } = body;

  if (!content || !String(content).trim()) throw ApiError.badRequest('Message content is required');
  if (!KINDS.includes(kind)) throw ApiError.badRequest('Invalid message kind');

  let convId = conversationId;
  if (!convId) {
    if (!receiverId) throw ApiError.badRequest('conversationId or receiverId is required');
    if (receiverId === userId) throw ApiError.badRequest('Cannot message yourself');
    const other = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(receiverId).first();
    if (!other) throw ApiError.notFound('User not found');

    const existing = await c.env.DB.prepare(
      `SELECT * FROM conversations WHERE user_a_id = ? AND user_b_id = ? AND COALESCE(property_id, '') = COALESCE(?, '')`,
    ).bind(userId, receiverId, propertyId).first();
    convId = existing ? existing.id as string : uuid();
    if (!existing) {
      await c.env.DB.prepare(
        'INSERT INTO conversations (id, user_a_id, user_b_id, property_id) VALUES (?, ?, ?, ?)',
      ).bind(convId, userId, receiverId, propertyId).run();
    }
  }

  const messageId = uuid();
  await c.env.DB.prepare(
    `INSERT INTO messages (id, conversation_id, sender_id, body, kind, file_url) VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(messageId, convId, userId, String(content), kind, fileUrl).run();

  await c.env.DB.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').bind(nowIso(), convId).run();
  await c.env.DB.prepare(
    `INSERT INTO message_reads (user_id, conversation_id, last_read_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id, conversation_id) DO UPDATE SET last_read_at = excluded.last_read_at`,
  ).bind(userId, convId, nowIso()).run();

  const row = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first();
  return c.json({ success: true, data: toMessage(row) }, 201);
});

// ---------------------------------------------------------------------------
// PUT /api/messages/read  (bulk mark read)
// ---------------------------------------------------------------------------
messages.put('/read', requireAuth, async (c) => {
  const userId = currentUserId(c);
  const body = await c.req.json().catch(() => ({}));
  const conversationId = body.conversation_id ?? body.conversationId;
  if (!conversationId) throw ApiError.badRequest('conversation_id is required');
  await c.env.DB.prepare(
    `INSERT INTO message_reads (user_id, conversation_id, last_read_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id, conversation_id) DO UPDATE SET last_read_at = excluded.last_read_at`,
  ).bind(userId, conversationId, nowIso()).run();
  return c.json({ success: true, data: { read: true } });
});

// ---------------------------------------------------------------------------
// PUT /api/messages/conversations/:id/archive
// ---------------------------------------------------------------------------
messages.put('/conversations/:id/archive', requireAuth, async (c) => {
  const userId = currentUserId(c);
  const conversationId = c.req.param('id');
  const conv = await getConversation(c, conversationId, userId);

  const col = conv.user_a_id === userId ? 'archived_a' : 'archived_b';
  const body = await c.req.json().catch(() => ({}));
  const archived = body.archived !== false ? 1 : 0;
  await c.env.DB.prepare(`UPDATE conversations SET ${col} = ? WHERE id = ?`)
    .bind(archived, conversationId).run();
  return c.json({ success: true, data: { archived: archived === 1 } });
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
messages.get('/notifications', requireAuth, async (c) => {
  const userId = currentUserId(c);
  const unreadOnly = c.req.query('unread_only') === 'true' || c.req.query('unreadOnly') === 'true';
  const rows = unreadOnly
    ? await c.env.DB.prepare('SELECT * FROM notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC LIMIT 50')
      .bind(userId).all()
    : await c.env.DB.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .bind(userId).all();
  return c.json({
    success: true,
    data: rows.results.map((r) => ({ ...r, read: r.read === 1 })),
  });
});

messages.put('/notifications/read', requireAuth, async (c) => {
  const userId = currentUserId(c);
  const body = await c.req.json().catch(() => ({}));
  const ids = Array.isArray(body.notification_ids) ? body.notification_ids : (Array.isArray(body.ids) ? body.ids : []);
  if (ids.length === 0) {
    await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').bind(userId).run();
  } else {
    const stmt = c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?');
    await c.env.DB.batch(ids.map((nid: string) => stmt.bind(nid, userId)));
  }
  return c.json({ success: true, data: { read: true } });
});

messages.get('/search', requireAuth, async (c) => {
  const userId = currentUserId(c);
  const q = c.req.query('q');
  if (!q) return c.json({ success: true, data: [] });
  const like = `%${q}%`;
  const rows = await c.env.DB.prepare(
    `SELECT m.* FROM messages m
     JOIN conversations conv ON conv.id = m.conversation_id
     WHERE (conv.user_a_id = ? OR conv.user_b_id = ?) AND m.kind = 'text' AND m.body LIKE ?
     ORDER BY m.created_at DESC LIMIT 50`,
  ).bind(userId, userId, like).all();
  return c.json({ success: true, data: rows.results.map(toMessage) });
});
