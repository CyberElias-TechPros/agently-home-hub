// Admin routes: platform stats, users, content moderation, audit log, tickets,
// system config/health. All admin-only (verified server-side).

import { ok, created, badRequest, unauthorized, forbidden, notFound, parseJson, currentUser, parsePagination, paginated, isAdmin } from '../lib/http.js';
import { all, get, run, newId, now, getMode } from '../db/db.js';
import { isSimulated } from '../lib/payments.js';
import config from '../config.js';
import { getMailbox, clearMailbox } from '../lib/email.js';

export async function handleAdmin(req, res, parts) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  if (user.role !== 'admin') return forbidden(res, 'Admin access required');

  if (req.method === 'GET' && parts.length >= 1 && parts[0] === 'users') return users(req, res, parts);
  if (req.method === 'PATCH' && parts.length === 3 && parts[0] === 'users' && parts[2] === 'status') return setUserStatus(req, res, parts[1]);
  if (req.method === 'PUT' && parts.length === 3 && parts[0] === 'users' && parts[2] === 'role') return setUserRole(req, res, parts[1]);

  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'stats') return stats(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'audit') return audit(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'tickets') return tickets(req, res);
  if (req.method === 'PATCH' && parts.length === 3 && parts[0] === 'tickets' && parts[2] === 'status') return setTicketStatus(req, res, parts[1]);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'flags') return flags(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'health') return health(req, res);
  return notFound(res, 'Admin route not found');
}

async function stats(req, res) {
  const users = await get('SELECT COUNT(*) AS c FROM users');
  const properties = await get('SELECT COUNT(*) AS c FROM properties');
  const available = await get(`SELECT COUNT(*) AS c FROM properties WHERE status = 'available' AND published = 1`);
  const bookings = await get('SELECT COUNT(*) AS c FROM bookings');
  const paidBookings = await get(`SELECT COUNT(*) AS c FROM bookings WHERE payment_status = 'paid'`);
  const maintenance = await get('SELECT COUNT(*) AS c FROM maintenance_requests');
  const openMaintenance = await get(`SELECT COUNT(*) AS c FROM maintenance_requests WHERE status IN ('pending','in_progress','assigned')`);
  const messages = await get('SELECT COUNT(*) AS c FROM messages');
  const tickets = await get(`SELECT COUNT(*) AS c FROM support_tickets WHERE status = 'open'`);
  const revenue = await get(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'succeeded'`);

  const roleBreakdown = await all('SELECT role, COUNT(*) AS c FROM users GROUP BY role');
  const bookingsByStatus = await all('SELECT status, COUNT(*) AS c FROM bookings GROUP BY status');
  const signupsByDay = await all(
    `SELECT substr(created_at,1,10) AS day, COUNT(*) AS c FROM users GROUP BY day ORDER BY day DESC LIMIT 14`
  );
  const topProperties = await all(
    `SELECT p.id, p.title, p.city, p.price, COUNT(v.id) AS views
     FROM property_views v JOIN properties p ON p.id = v.property_id
     GROUP BY p.id ORDER BY views DESC LIMIT 5`
  );

  return ok(res, {
    metrics: {
      totalUsers: users.c,
      totalProperties: properties.c,
      availableListings: available.c,
      totalBookings: bookings.c,
      paidBookings: paidBookings.c,
      totalMaintenance: maintenance.c,
      openMaintenance: openMaintenance.c,
      totalMessages: messages.c,
      openTickets: tickets.c,
      revenue: revenue.total,
    },
    breakdown: {
      usersByRole: roleBreakdown.reduce((a, r) => { a[r.role] = r.c; return a; }, {}),
      bookingsByStatus: bookingsByStatus.reduce((a, r) => { a[r.status] = r.c; return a; }, {}),
    },
    trends: { signups: signupsByDay.reverse() },
    topProperties: topProperties.map((t) => ({ id: t.id, title: t.title, city: t.city, price: t.price, views: t.views })),
  });
}

async function users(req, res, parts) {
  const { page, limit, offset } = parsePagination(req.query || {});
  const where = [];
  const params = [];
  if (req.query.search) {
    where.push('(u.name LIKE ? OR u.email LIKE ?)');
    const s = `%${String(req.query.search).trim()}%`;
    params.push(s, s);
  }
  if (req.query.role && req.query.role !== 'all') {
    where.push('u.role = ?');
    params.push(String(req.query.role));
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = await get(`SELECT COUNT(*) AS c FROM users u ${whereSql}`, params);
  const rows = await all(
    `SELECT u.id, u.name, u.email, u.role, u.verified, u.status, u.created_at, u.last_login, p.trust_score
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     ${whereSql} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return paginated(res, rows, totalRow.c, page, limit);
}

async function setUserStatus(req, res, id) {
  const body = parseJson(req) || {};
  const status = body.status === 'suspended' ? 'suspended' : 'active';
  await run('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', [status, now(), id]);
  await audit(req, res, { action: 'user_status', resourceId: id, details: { status } });
  if (status === 'suspended') await run('DELETE FROM sessions WHERE user_id = ?', [id]);
  return ok(res, { message: `User ${status}`, id, status });
}

async function setUserRole(req, res, id) {
  const body = parseJson(req) || {};
  const valid = ['tenant', 'landlord', 'agent', 'manager', 'admin'];
  if (!valid.includes(body.role)) return badRequest(res, 'Invalid role');
  await run('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [body.role, now(), id]);
  return ok(res, { message: 'Role updated', id, role: body.role });
}

async function audit(req, res, extra) {
  if (extra) {
    try {
      await run('INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        newId('alg'), extra.userId || null, extra.action || 'admin_action', extra.resource || 'user', extra.resourceId || null, JSON.stringify(extra.details || {}), '0.0.0.0',
      ]);
    } catch (e) { console.error('audit insert failed', e.message); }
    return;
  }
  const { page, limit, offset } = parsePagination(req.query || {});
  const totalRow = await get('SELECT COUNT(*) AS c FROM audit_logs');
  const rows = await all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
  return paginated(res, rows, totalRow.c, page, limit);
}

async function tickets(req, res) {
  const { page, limit, offset } = parsePagination(req.query || {});
  const totalRow = await get('SELECT COUNT(*) AS c FROM support_tickets');
  const rows = await all(
    `SELECT s.*, u.name AS user_name, u.email AS user_email
     FROM support_tickets s JOIN users u ON u.id = s.user_id
     ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return paginated(res, rows, totalRow.c, page, limit);
}

async function setTicketStatus(req, res, id) {
  const body = parseJson(req) || {};
  const valid = ['open', 'in_progress', 'resolved', 'closed'];
  if (!valid.includes(body.status)) return badRequest(res, 'Invalid status');
  await run('UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?', [body.status, now(), id]);
  return ok(res, { message: 'Ticket updated', id, status: body.status });
}

async function flags(req, res) {
  const rows = await all('SELECT * FROM feature_flags ORDER BY key ASC');
  return ok(res, { items: rows });
}

async function health(req, res) {
  const dbMode = getMode();
  const db = await get('SELECT COUNT(*) AS c FROM users').catch(() => ({ c: -1 }));
  return ok(res, {
    status: db.c >= 0 ? 'healthy' : 'degraded',
    service: 'agently-api',
    version: '2.0.0',
    environment: config.nodeEnv,
    database: { mode: dbMode, connected: db.c >= 0, users: db.c },
    payments: { provider: isSimulated() ? 'simulation' : 'paystack', enabled: !isSimulated(), feeNgn: config.bookingFeeNgn },
    time: now(),
  });
}
