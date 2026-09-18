/**
 * Maintenance requests: create, list, status transitions.
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { ApiError } from '../errors';
import { uuid, nowIso } from '../crypto';
import { requireAuth, requireRole, currentUserId } from '../middleware';

type Ctx = { Bindings: Env; Variables: Variables };

export const maintenance = new Hono<Ctx>();

const VALID_CATEGORIES = ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'cleaning', 'other'];
const VALID_PRIORITY = ['low', 'medium', 'high', 'emergency'];
const VALID_STATUS = ['pending', 'in_progress', 'resolved', 'cancelled'];
const TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['resolved', 'cancelled'],
  resolved: [],
  cancelled: [],
};

function toPublic(row: any): Record<string, unknown> {
  const parseJson = (v: unknown) => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return []; }
  };
  return {
    id: row.id,
    propertyId: row.property_id ?? null,
    tenantId: row.tenant_id,
    landlordId: row.landlord_id ?? null,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    images: parseJson(row.images),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

maintenance.post('/', requireAuth, requireRole('tenant', 'manager'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 4) throw ApiError.badRequest('title is required (min 4 characters)');
  const category = VALID_CATEGORIES.includes(body.category) ? body.category : 'other';
  const priority = VALID_PRIORITY.includes(body.priority) ? body.priority : 'medium';
  const description = typeof body.description === 'string' ? body.description : '';
  const images = Array.isArray(body.images) ? JSON.stringify(body.images) : '[]';

  let propertyId = body.propertyId ?? null;
  let landlordId = null;
  if (propertyId) {
    const prop = await c.env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(propertyId).first();
    if (!prop) throw ApiError.notFound('Property not found');
    landlordId = prop.landlord_id;
  }

  const reqId = uuid();
  await c.env.DB.prepare(
    `INSERT INTO maintenance_requests (id, property_id, tenant_id, landlord_id, title, description, category, priority, status, images)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).bind(reqId, propertyId, currentUserId(c), landlordId, title, description, category, priority, images).run();

  if (landlordId) {
    const noteId = uuid();
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, link)
       VALUES (?, ?, 'maintenance', 'New maintenance request', ?, ?)`,
    ).bind(noteId, landlordId, title, '/maintenance').run();
  }

  const row = await c.env.DB.prepare('SELECT * FROM maintenance_requests WHERE id = ?').bind(reqId).first();
  return c.json({ success: true, data: toPublic(row) }, 201);
});

maintenance.get('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const rows = user.role === 'landlord' || user.role === 'manager' || user.role === 'admin'
    ? await c.env.DB.prepare(
        `SELECT m.* FROM maintenance_requests m
         WHERE (m.landlord_id = ?
           OR m.property_id IN (SELECT id FROM properties WHERE landlord_id = ?))
         ORDER BY m.created_at DESC`,
      ).bind(user.sub, user.sub).all()
    : await c.env.DB.prepare('SELECT * FROM maintenance_requests WHERE tenant_id = ? ORDER BY created_at DESC')
      .bind(user.sub).all();

  return c.json({ success: true, data: rows.results.map(toPublic) });
});

maintenance.put('/:id/status', requireAuth, async (c) => {
  const id_ = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const status = body.status;
  if (!VALID_STATUS.includes(status)) throw ApiError.badRequest('Invalid status');

  const row = await c.env.DB.prepare('SELECT * FROM maintenance_requests WHERE id = ?').bind(id_).first();
  if (!row) throw ApiError.notFound('Maintenance request not found');

  const user = c.get('user')!;
  const isStaff = ['admin', 'manager', 'landlord'].includes(user.role);
  const owns = row.tenant_id === user.sub || row.landlord_id === user.sub;
  if (!owns && !isStaff) throw ApiError.forbidden('Forbidden');

  const allowed = TRANSITIONS[row.status as string] ?? [];
  if (!allowed.includes(status)) {
    throw ApiError.conflict(`Cannot move request from ${row.status} to ${status}`);
  }

  await c.env.DB.prepare('UPDATE maintenance_requests SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, nowIso(), id_).run();

  if (status === 'resolved') {
    const noteId = uuid();
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, link)
       VALUES (?, ?, 'maintenance', 'Request resolved', ?, ?)`,
    ).bind(noteId, row.tenant_id, `"${row.title}" has been resolved.`, '/maintenance').run();
  }

  const updated = await c.env.DB.prepare('SELECT * FROM maintenance_requests WHERE id = ?').bind(id_).first();
  return c.json({ success: true, data: toPublic(updated) });
});
