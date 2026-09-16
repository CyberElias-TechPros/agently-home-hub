// Messaging + notifications routes. Runtime-agnostic.

import { ok, created, badRequest, unauthorized, forbidden, notFound, parseJson, currentUser, parsePagination, paginated } from '../lib/http.js';
import { all, get, run, newId, now } from '../db/db.js';

function userById(id) {
  return get('SELECT id, name, email, role, avatar_url FROM users WHERE id = ?', [id]);
}

export async function handleMessages(req, res, parts) {
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'conversations') return listConversations(req, res);
  if (req.method === 'GET' && parts.length === 3 && parts[0] === 'conversations' && parts[2] === 'messages') return getMessages(req, res, parts[1]);
  if (req.method === 'PUT' && parts.length === 3 && parts[0] === 'conversations' && parts[2] === 'archive') return archiveConversation(req, res, parts[1]);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'send') return sendMessage(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'unread') return unreadCount(req, res);

  // Notifications
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'notifications') return listNotifications(req, res);
  if (req.method === 'PUT' && parts.length === 2 && parts[0] === 'notifications' && parts[1] === 'read') return markNotificationsRead(req, res);
  return notFound(res, 'Messages route not found');
}

function conversationView(row, viewerId) {
  if (!row) return null;
  const otherId = row.user_a === viewerId ? row.user_b : row.user_a;
  return {
    id: row.id,
    otherUser: {
      id: otherId,
      name: row.user_a === viewerId ? row.other_b_name : row.other_a_name,
      avatar: row.user_a === viewerId ? row.other_b_avatar : row.other_a_avatar,
      role: row.user_a === viewerId ? row.other_b_role : row.other_a_role,
    },
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    lastMessage: row.last_message,
    updatedAt: row.updated_at,
    unreadCount: row.unread_count ?? 0,
  };
}

const CONVERSATION_SELECT = `
  SELECT c.*,
    a.name AS other_a_name, a.avatar_url AS other_a_avatar, a.role AS other_a_role,
    b.name AS other_b_name, b.avatar_url AS other_b_avatar, b.role AS other_b_role,
    p.title AS property_title,
    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.receiver_id = ? AND m.read = 0) AS unread_count
  FROM conversations c
  JOIN users a ON a.id = c.user_a
  JOIN users b ON b.id = c.user_b
  LEFT JOIN properties p ON p.id = c.property_id
`;

async function listConversations(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const { page, limit, offset } = parsePagination(req.query || {});
  const where = 'WHERE c.user_a = ? OR c.user_b = ?';
  const params = [user.id, user.id, user.id];
  const totalRow = await get(
    `SELECT COUNT(*) AS c FROM conversations c ${where}`,
    [user.id, user.id]
  );
  const total = totalRow.c;
  const rows = await all(
    `${CONVERSATION_SELECT} ${where} ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return paginated(res, rows.map((r) => conversationView(r, user.id)), total, page, limit);
}

async function getMessages(req, res, conversationId) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const conv = await get('SELECT * FROM conversations WHERE id = ?', [conversationId]);
  if (!conv) return notFound(res, 'Conversation not found');
  if (conv.user_a !== user.id && conv.user_b !== user.id) return forbidden(res, 'You are not part of this conversation');

  const { page, limit, offset } = parsePagination(req.query || {});
  const totalRow = await get('SELECT COUNT(*) AS c FROM messages WHERE conversation_id = ?', [conversationId]);
  const rows = await all(
    `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [conversationId, limit, offset]
  );
  const items = rows.reverse().map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    content: m.content,
    type: m.type,
    read: !!m.read,
    createdAt: m.created_at,
  }));
  return paginated(res, items, totalRow.c, page, limit);
}

async function findOrCreateConversation(a, b, propertyId) {
  const existing = await get(
    'SELECT id FROM conversations WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)',
    [a, b, b, a]
  );
  if (existing) return existing.id;
  const id = newId('cnv');
  await run(
    `INSERT INTO conversations (id, user_a, user_b, property_id) VALUES (?, ?, ?, ?)`,
    [id, a, b, propertyId || null]
  );
  return id;
}

async function sendMessage(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const receiverId = body.receiverId || body.receiver_id;
  const content = (body.content || '').toString().trim();
  const propertyId = body.propertyId || body.property_id || null;

  if (!receiverId || !content) return badRequest(res, 'receiverId and content are required');
  if (content.length > 4000) return badRequest(res, 'Message is too long');
  if (receiverId === user.id) return badRequest(res, 'You cannot message yourself');

  const receiver = await get('SELECT id FROM users WHERE id = ?', [receiverId]);
  if (!receiver) return notFound(res, 'Recipient not found');

  let propertyTitle = null;
  if (propertyId) {
    const p = await get('SELECT title FROM properties WHERE id = ?', [propertyId]);
    propertyTitle = p ? p.title : null;
  }

  const conversationId = await findOrCreateConversation(user.id, receiverId, propertyId);
  const id = newId('msg');
  await run(
    `INSERT INTO messages (id, conversation_id, sender_id, receiver_id, content, type, read)
     VALUES (?, ?, ?, ?, ?, 'text', 0)`,
    [id, conversationId, user.id, receiverId, content]
  );
  await run(`UPDATE conversations SET last_message = ?, updated_at = ? WHERE id = ?`, [content.slice(0, 200), now(), conversationId]);
  await run(
    `INSERT INTO notifications (id, user_id, type, title, body, link, read) VALUES (?, ?, 'message', ?, ?, '/messages', 0)`,
    [newId('ntf'), receiverId, `${user.name} sent you a message`, content.slice(0, 140)]
  );

  return created(res, {
    message: 'Message sent',
    item: {
      id,
      conversationId,
      senderId: user.id,
      receiverId,
      content,
      type: 'text',
      read: false,
      createdAt: now(),
      propertyTitle,
    },
  });
}

async function startConversation(req, res, otherUserId) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const receiver = await userById(otherUserId);
  if (!receiver) return notFound(res, 'User not found');
  const conversationId = await findOrCreateConversation(user.id, otherUserId, body.propertyId || null);
  return ok(res, {
    conversation: conversationView(
      await get(`${CONVERSATION_SELECT} WHERE c.id = ?`, [user.id, conversationId]),
      user.id
    ),
  });
}

async function markRead(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const ids = body.messageIds || body.message_ids || body.ids || [];
  if (!Array.isArray(ids) || !ids.length) return badRequest(res, 'messageIds array required');

  const placeholders = ids.map(() => '?').join(',');
  await run(
    `UPDATE messages SET read = 1 WHERE receiver_id = ? AND id IN (${placeholders})`,
    [user.id, ...ids]
  );
  return ok(res, { message: 'Marked as read', count: ids.length });
}

async function archiveConversation(req, res, conversationId) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const conv = await get('SELECT * FROM conversations WHERE id = ?', [conversationId]);
  if (!conv) return notFound(res, 'Conversation not found');
  if (conv.user_a !== user.id && conv.user_b !== user.id) return forbidden(res);
  await run('DELETE FROM conversations WHERE id = ?', [conversationId]);
  return ok(res, { message: 'Conversation archived' });
}

async function unreadCount(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const messages = await get('SELECT COUNT(*) AS c FROM messages WHERE receiver_id = ? AND read = 0', [user.id]);
  const notifications = await get('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0', [user.id]);
  return ok(res, { unreadMessages: messages.c, unreadNotifications: notifications.c });
}

async function listNotifications(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const { page, limit, offset } = parsePagination(req.query || {});
  const unreadOnly = req.query.unread_only === 'true' || req.query.unreadOnly === 'true';
  const where = unreadOnly ? 'WHERE user_id = ? AND read = 0' : 'WHERE user_id = ?';
  const params = [user.id];
  const totalRow = await get(`SELECT COUNT(*) AS c FROM notifications ${where}`, params);
  const rows = await all(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const items = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: !!n.read,
    createdAt: n.created_at,
  }));
  return paginated(res, items, totalRow.c, page, limit);
}

async function markNotificationsRead(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const ids = body.notificationIds || body.notification_ids || body.ids || [];
  if (Array.isArray(ids) && ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    await run(`UPDATE notifications SET read = 1 WHERE user_id = ? AND id IN (${placeholders})`, [user.id, ...ids]);
  } else if (body.all === true) {
    await run(`UPDATE notifications SET read = 1 WHERE user_id = ?`, [user.id]);
  } else {
    return badRequest(res, 'notificationIds array or { all: true } required');
  }
  return ok(res, { message: 'Notifications marked read' });
}
