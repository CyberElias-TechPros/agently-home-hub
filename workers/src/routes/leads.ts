/**
 * Agent CRM leads: list, create, update, assign, statistics, and lead
 * capture for any interested user.
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { ApiError } from '../errors';
import { uuid, nowIso } from '../crypto';
import { requireAuth, currentUserId } from '../middleware';

type Ctx = { Bindings: Env; Variables: Variables };

export const leads = new Hono<Ctx>();

const VALID_STATUS = ['new', 'contacted', 'qualified', 'touring', 'negotiating', 'closed_won', 'closed_lost'];

function toPublic(row: any): Record<string, unknown> {
  return {
    id: row.id,
    ownerId: row.owner_id ?? null,
    tenantId: row.tenant_id ?? null,
    propertyId: row.property_id ?? null,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    phone: row.phone ?? null,
    source: row.source,
    status: row.status,
    priority: row.priority,
    budgetMin: row.budget_min ?? null,
    budgetMax: row.budget_max ?? null,
    notes: row.notes ?? null,
    leadScore: row.lead_score ?? 50,
    nextFollowUpAt: row.next_follow_up_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// POST /api/leads  (anyone; used for "contact me" intents)
// ---------------------------------------------------------------------------
leads.post('/', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!firstName && !lastName) throw ApiError.badRequest('Name is required');
  if (!email.includes('@')) throw ApiError.badRequest('A valid email is required');

  const leadId = uuid();
  await c.env.DB.prepare(
    `INSERT INTO leads (id, owner_id, tenant_id, property_id, first_name, last_name, email, phone, source,
       status, priority, budget_min, budget_max, notes, lead_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?)`,
  ).bind(
    leadId,
    body.ownerId ?? null,
    currentUserId(c),
    body.propertyId ?? null,
    firstName,
    lastName,
    email,
    body.phone ?? null,
    body.source ?? 'website',
    body.priority ?? 'medium',
    body.budgetMin ?? null,
    body.budgetMax ?? null,
    body.notes ?? null,
    body.leadScore ?? 50,
  ).run();

  const row = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
  return c.json({ success: true, data: toPublic(row) }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/leads (agents/manager/admin see everything or their own)
// ---------------------------------------------------------------------------
leads.get('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const rows = ['admin', 'manager'].includes(user.role)
    ? await c.env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 200').all()
    : await c.env.DB.prepare('SELECT * FROM leads WHERE owner_id = ? ORDER BY created_at DESC LIMIT 200')
      .bind(user.sub).all();

  return c.json({ success: true, data: rows.results.map(toPublic) });
});

// ---------------------------------------------------------------------------
// GET /api/leads/stats (pipeline metrics)
// ---------------------------------------------------------------------------
leads.get('/stats', requireAuth, async (c) => {
  const user = c.get('user')!;
  const rows = ['admin', 'manager'].includes(user.role)
    ? await c.env.DB.prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status').all()
    : await c.env.DB.prepare('SELECT status, COUNT(*) AS n FROM leads WHERE owner_id = ? GROUP BY status')
      .bind(user.sub).all();

  const counts: Record<string, number> = { total: 0 };
  for (const r of rows.results) {
    counts[r.status as string] = r.n as number;
    counts.total += r.n as number;
  }
  const won = counts.closed_won ?? 0;
  const lost = counts.closed_lost ?? 0;
  const closed = won + lost;
  counts.conversion_rate = closed > 0 ? Number(((won / closed) * 100).toFixed(1)) : 0;
  return c.json({ success: true, data: counts });
});

// ---------------------------------------------------------------------------
// GET /api/leads/:id
// ---------------------------------------------------------------------------
leads.get('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const row = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) throw ApiError.notFound('Lead not found');
  if (!['admin', 'manager'].includes(user.role) && row.owner_id !== user.sub && row.tenant_id !== user.sub) {
    throw ApiError.forbidden('Forbidden');
  }
  return c.json({ success: true, data: toPublic(row) });
});

// ---------------------------------------------------------------------------
// PUT /api/leads/:id
// ---------------------------------------------------------------------------
leads.put('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const row = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) throw ApiError.notFound('Lead not found');
  if (!['admin', 'manager'].includes(user.role) && row.owner_id !== user.sub) throw ApiError.forbidden('Forbidden');

  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: unknown[] = [];
  const scalarMap: Record<string, string> = {
    status: 'status', priority: 'priority', source: 'source',
    notes: 'notes', lead_score: 'leadScore', budget_min: 'budgetMin', budget_max: 'budgetMax',
    first_name: 'firstName', last_name: 'lastName', phone: 'phone', email: 'email',
    next_follow_up_at: 'nextFollowUpAt', owner_id: 'ownerId', property_id: 'propertyId',
  };
  for (const [col, key] of Object.entries(scalarMap)) {
    if (body[key] !== undefined && body[key] !== null) {
      sets.push(`${col} = ?`);
      params.push(body[key]);
    }
  }
  if (body.status && !VALID_STATUS.includes(body.status)) throw ApiError.badRequest('Invalid status');

  if (sets.length === 0) throw ApiError.badRequest('No valid fields to update');
  sets.push('updated_at = ?');
  params.push(nowIso(), c.req.param('id'));
  await c.env.DB.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();

  const updated = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(c.req.param('id')).first();
  return c.json({ success: true, data: toPublic(updated) });
});

// ---------------------------------------------------------------------------
// DELETE /api/leads/:id
// ---------------------------------------------------------------------------
leads.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const row = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) throw ApiError.notFound('Lead not found');
  if (!['admin', 'manager'].includes(user.role) && row.owner_id !== user.sub) throw ApiError.forbidden('Forbidden');
  await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true, data: { deleted: true } });
});
