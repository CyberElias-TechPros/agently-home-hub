// Maintenance requests routes. Runtime-agnostic.

import { ok, created, badRequest, unauthorized, forbidden, notFound, parseJson, currentUser, parsePagination, paginated } from '../lib/http.js';
import { all, get, run, newId, now } from '../db/db.js';

const CATEGORIES = ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'cleaning', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'emergency'];
const STATUSES = ['pending', 'in_progress', 'assigned', 'resolved', 'cancelled'];

export async function handleMaintenance(req, res, parts) {
  if (req.method === 'GET' && parts.length === 0) return listRequests(req, res);
  if (req.method === 'POST' && parts.length === 0) return createRequest(req, res);
  if (req.method === 'POST' && parts.length === 2 && parts[1] === 'schedule') return createScheduledRequest(req, res); // alias for portability
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'stats') return stats(req, res);
  if (parts.length === 1) {
    if (req.method === 'PUT') return updateRequest(req, res, parts[0]);
    if (req.method === 'GET') return getRequest(req, res, parts[0]);
  }
  return notFound(res, 'Maintenance route not found');
}

function safeJson(v, fb) {
  if (v == null || v === '') return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

function rowView(row, viewerId) {
  if (!row) return null;
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    propertyAddress: row.property_address,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    landlordId: row.landlord_id,
    landlordName: row.landlord_name,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    images: safeJson(row.images, []),
    assignedTo: row.assigned_to,
    estimatedCost: row.estimated_cost,
    actualCost: row.actual_cost,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    canManage: viewerId === row.landlord_id,
  };
}

const MAINTENANCE_SELECT = `
  SELECT m.*,
    p.title AS property_title, p.address AS property_address, p.landlord_id AS landlord_id,
    t.name AS tenant_name, l.name AS landlord_name
  FROM maintenance_requests m
  JOIN properties p ON p.id = m.property_id
  JOIN users t ON t.id = m.tenant_id
  JOIN users l ON l.id = p.landlord_id
`;

async function listRequests(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);

  const where = [];
  const params = [];
  if (user.role === 'tenant') {
    where.push('m.tenant_id = ?');
    params.push(user.id);
  } else {
    where.push('p.landlord_id = ?');
    params.push(user.id);
  }
  if (req.query.status && STATUSES.includes(String(req.query.status))) {
    where.push('m.status = ?');
    params.push(String(req.query.status));
  }
  if (req.query.category && CATEGORIES.includes(String(req.query.category))) {
    where.push('m.category = ?');
    params.push(String(req.query.category));
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const { page, limit, offset } = parsePagination(req.query || {});
  const totalRow = await get(`SELECT COUNT(*) AS c FROM maintenance_requests m JOIN properties p ON p.id = m.property_id ${whereSql}`, params);
  const rows = await all(`${MAINTENANCE_SELECT} ${whereSql} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  return paginated(res, rows.map((r) => rowView(r, user.id)), totalRow.c, page, limit);
}

async function createRequest(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  if (user.role !== 'tenant') return forbidden(res, 'Only tenants can file maintenance requests');
  const body = parseJson(req);
  if (!body) return badRequest(res, 'Invalid JSON body');

  const { propertyId, title, description, category = 'other', priority = 'medium' } = body;
  if (!propertyId || !title || !description) return badRequest(res, 'propertyId, title and description are required');
  if (!CATEGORIES.includes(String(category))) return badRequest(res, 'Invalid category');
  if (!PRIORITIES.includes(String(priority))) return badRequest(res, 'Invalid priority');

  // Tenant must live at the property (confirmed booking).
  const tenancy = await get(
    `SELECT id FROM bookings WHERE property_id = ? AND tenant_id = ? AND status IN ('confirmed','completed') LIMIT 1`,
    [propertyId, user.id]
  );
  if (!tenancy) return forbidden(res, 'You do not have an active tenancy at this property');

  const id = newId('mnt');
  await run(
    `INSERT INTO maintenance_requests (id, property_id, tenant_id, title, description, category, priority, status, images)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, propertyId, user.id, String(title).trim(), String(description).trim(), String(category), String(priority), JSON.stringify(Array.isArray(body.images) ? body.images : [])]
  );

  const prop = await get('SELECT landlord_id, title FROM properties WHERE id = ?', [propertyId]);
  await run(
    `INSERT INTO notifications (id, user_id, type, title, body, link, read) VALUES (?, ?, 'maintenance', 'New maintenance request', ?, '/landlord', 0)`,
    [newId('ntf'), prop.landlord_id, `${user.name} filed a maintenance request for "${prop.title}".`]
  );

  const row = await get(`${MAINTENANCE_SELECT} WHERE m.id = ?`, [id]);
  return created(res, { message: 'Maintenance request submitted', item: rowView(row, user.id) });
}

async function getRequest(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const row = await get(`${MAINTENANCE_SELECT} WHERE m.id = ?`, [id]);
  if (!row) return notFound(res, 'Request not found');
  if (row.tenant_id !== user.id && row.landlord_id !== user.id && user.role !== 'admin') {
    return forbidden(res);
  }
  return ok(res, { item: rowView(row, user.id) });
}

async function updateRequest(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const row = await get('SELECT * FROM maintenance_requests WHERE id = ?', [id]);
  if (!row) return notFound(res, 'Request not found');
  const prop = await get('SELECT landlord_id FROM properties WHERE id = ?', [row.property_id]);
  const isLandlord = prop.landlord_id === user.id;
  const isTenant = row.tenant_id === user.id;
  if (!isLandlord && !isTenant && user.role !== 'admin') return forbidden(res);

  const body = parseJson(req) || {};
  const upd = [];
  const params = [];
  if (isLandlord || user.role === 'admin') {
    if (body.status !== undefined) {
      if (!STATUSES.includes(String(body.status))) return badRequest(res, 'Invalid status');
      upd.push('status = ?');
      params.push(String(body.status));
      if (body.status === 'resolved') { upd.push('resolved_at = ?'); params.push(now()); }
    }
    if (body.assignedTo !== undefined && body.assignedTo !== null) { upd.push('assigned_to = ?'); params.push(String(body.assignedTo)); }
    if (body.estimatedCost !== undefined) { upd.push('estimated_cost = ?'); params.push(parseInt(body.estimatedCost, 10) || 0); }
    if (body.actualCost !== undefined) { upd.push('actual_cost = ?'); params.push(parseInt(body.actualCost, 10) || 0); }
  }
  if (isTenant) {
    if (body.title !== undefined) { upd.push('title = ?'); params.push(String(body.title).trim()); }
    if (body.description !== undefined) { upd.push('description = ?'); params.push(String(body.description).trim()); }
    if (body.priority !== undefined && PRIORITIES.includes(String(body.priority))) { upd.push('priority = ?'); params.push(String(body.priority)); }
  }
  if (!upd.length) return badRequest(res, 'No fields to update');
  upd.push('updated_at = ?');
  params.push(now());
  params.push(id);
  await run(`UPDATE maintenance_requests SET ${upd.join(', ')} WHERE id = ?`, params);

  const updated = await get(`${MAINTENANCE_SELECT} WHERE m.id = ?`, [id]);
  if (updated.status === 'resolved') {
    await run(
      `INSERT INTO notifications (id, user_id, type, title, body, link, read) VALUES (?, ?, 'maintenance', 'Request resolved', ?, '/bookings', 0)`,
      [newId('ntf'), updated.tenant_id, `Your maintenance request "${updated.title}" was marked resolved.`]
    );
  }
  return ok(res, { message: 'Maintenance request updated', item: rowView(updated, user.id) });
}

async function createScheduledRequest(req, res) {
  // Scheduling is just a maintenance request with an optional due hint — keep
  // the contract identical to the core create path for client portability.
  return createRequest(req, res);
}

async function stats(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  let scope = 'tenant_id = ?';
  if (user.role !== 'tenant') scope = 'property_id IN (SELECT id FROM properties WHERE landlord_id = ?)';
  const param = user.id;

  const byStatus = await all(
    `SELECT status, COUNT(*) AS c FROM maintenance_requests WHERE ${scope} GROUP BY status`,
    [param]
  );
  const open = await get(`SELECT COUNT(*) AS c FROM maintenance_requests WHERE ${scope} AND status IN ('pending','in_progress','assigned')`, [param]);
  const resolved = await get(`SELECT COUNT(*) AS c FROM maintenance_requests WHERE ${scope} AND status = 'resolved'`, [param]);

  return ok(res, {
    open: open.c,
    resolved: resolved.c,
    total: byStatus.reduce((a, b) => a + b.c, 0),
    byStatus: byStatus.reduce((acc, r) => { acc[r.status] = r.c; return acc; }, {}),
  });
}
