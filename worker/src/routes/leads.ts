import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth, requireParam } from '../http/context';
import { created, ok } from '../http/responses';
import { validate, parseJsonBody, paginationSchema, validateQuery } from '../http/validate';
import { withRateLimit } from '../http/middleware';
import { ApiError } from '../lib/errors';
import { execute, nowIso, queryAll, queryOne } from '../repositories/db';
import {
  COMMISSION_STATUSES,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  SHOWING_STATUSES,
  toCommissionDto,
  toLeadDto,
  toShowingDto,
  type CommissionRow,
  type LeadRow,
  type ShowingRow,
} from '../domain/lead';
import { createNotification } from '../services/notifications';
import { recordAudit } from '../services/notifications';

const leadSchema = z.object({
  first_name: z.string().trim().min(1, 'Enter a first name.').max(80),
  last_name: z.string().trim().min(1, 'Enter a last name.').max(80),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  phone: z.string().trim().max(32).optional(),
  company: z.string().trim().max(120).optional(),
  source: z.string().trim().max(40).default('website'),
  property_id: z.string().uuid().optional(),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  preferred_locations: z.array(z.string().trim().max(120)).max(20).default([]),
  preferred_property_types: z.array(z.string().trim().max(40)).max(10).default([]),
  preferred_bedrooms: z.number().int().min(0).max(50).optional(),
  preferred_bathrooms: z.number().int().min(0).max(50).optional(),
  move_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(LEAD_STATUSES).default('new'),
  priority: z.enum(LEAD_PRIORITIES).default('medium'),
  lead_score: z.number().int().min(0).max(100).default(0),
  conversion_probability: z.number().int().min(0).max(100).default(0),
  estimated_commission: z.number().min(0).optional(),
  notes: z.string().trim().max(5000).optional(),
  next_follow_up_at: z.string().optional(),
});

export const leadRoutes = new Hono<AppEnv>();

const LEAD_SELECT = `
  SELECT l.*, p.title AS property_title, u.name AS agent_name
    FROM leads l
    LEFT JOIN properties p ON p.id = l.property_id
    LEFT JOIN users u ON u.id = l.agent_id
`;

leadRoutes.get('/', async (c: AppContext) => {
  const auth = currentAuth(c);
  const query = validateQuery(paginationSchema, new URL(c.req.url).searchParams);

  // Agents see their own pipeline; managers and admins see everything.
  const isPrivileged = auth.role === 'admin' || auth.role === 'manager';
  const where = isPrivileged ? '' : 'WHERE l.agent_id = ?';
  const params: unknown[] = isPrivileged ? [] : [auth.userId];

  const rows = await queryAll<LeadRow>(
    c.env.DB,
    `${LEAD_SELECT} ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    [...params, query.per_page, (query.page - 1) * query.per_page]
  );

  return ok({ data: rows.map(toLeadDto) });
});

/**
 * Pipeline statistics.
 *
 * Declared before `/:id` — Express-style routers match in registration order,
 * and the legacy API had this bug: `/statistics` was shadowed by `/:id` and
 * always returned "lead not found".
 */
leadRoutes.get('/statistics', async (c: AppContext) => {
  const auth = currentAuth(c);
  const isPrivileged = auth.role === 'admin' || auth.role === 'manager';
  const where = isPrivileged ? '' : 'WHERE agent_id = ?';
  const params: unknown[] = isPrivileged ? [] : [auth.userId];

  const row = await queryOne<Record<string, number>>(
    c.env.DB,
    `SELECT
        COUNT(*) AS total_leads,
        COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS new_leads,
        COALESCE(SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END), 0) AS contacted_leads,
        COALESCE(SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END), 0) AS qualified_leads,
        COALESCE(SUM(CASE WHEN status = 'closed_won' THEN 1 ELSE 0 END), 0) AS closed_won_leads,
        COALESCE(SUM(CASE WHEN status = 'closed_lost' THEN 1 ELSE 0 END), 0) AS closed_lost_leads,
        COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END), 0) AS leads_this_month,
        COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END), 0) AS leads_this_week,
        COALESCE(AVG(lead_score), 0) AS avg_lead_score
       FROM leads ${where}`,
    params
  );

  const total = Number(row?.total_leads ?? 0);
  const won = Number(row?.closed_won_leads ?? 0);
  const lost = Number(row?.closed_lost_leads ?? 0);
  const decided = won + lost;

  return ok({
    data: {
      total_leads: total,
      new_leads: Number(row?.new_leads ?? 0),
      contacted_leads: Number(row?.contacted_leads ?? 0),
      qualified_leads: Number(row?.qualified_leads ?? 0),
      closed_won_leads: won,
      closed_lost_leads: lost,
      leads_this_month: Number(row?.leads_this_month ?? 0),
      leads_this_week: Number(row?.leads_this_week ?? 0),
      avg_lead_score: Math.round(Number(row?.avg_lead_score ?? 0)),
      // Win rate over decided leads, not over the whole pipeline: an agent with
      // 40 open leads is not performing badly.
      conversion_rate: decided === 0 ? 0 : Math.round((won / decided) * 100),
    },
  });
});

leadRoutes.get('/showings', async (c: AppContext) => {
  const auth = currentAuth(c);
  const isPrivileged = auth.role === 'admin' || auth.role === 'manager';
  const where = isPrivileged ? '' : 'WHERE s.agent_id = ?';
  const params: unknown[] = isPrivileged ? [] : [auth.userId];

  const rows = await queryAll<ShowingRow>(
    c.env.DB,
    `SELECT s.* FROM showings s ${where} ORDER BY s.scheduled_date ASC, s.scheduled_time ASC LIMIT 100`,
    params
  );
  return ok({ data: rows.map(toShowingDto) });
});

leadRoutes.get('/commissions', async (c: AppContext) => {
  const auth = currentAuth(c);
  const isPrivileged = auth.role === 'admin' || auth.role === 'manager';
  const where = isPrivileged ? '' : 'WHERE c.agent_id = ?';
  const params: unknown[] = isPrivileged ? [] : [auth.userId];

  const rows = await queryAll<CommissionRow>(
    c.env.DB,
    `SELECT c.* FROM commissions c ${where} ORDER BY c.created_at DESC LIMIT 100`,
    params
  );
  return ok({ data: rows.map(toCommissionDto) });
});

leadRoutes.post('/', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(leadSchema, await parseJsonBody(c.req.raw));

  if (body.budget_min !== undefined && body.budget_max !== undefined && body.budget_min > body.budget_max) {
    throw ApiError.validation('The minimum budget cannot exceed the maximum budget.', {
      budget_min: ['Must be less than or equal to the maximum budget.'],
    });
  }

  const id = crypto.randomUUID();
  await execute(
    c.env.DB,
    `INSERT INTO leads (
        id, agent_id, first_name, last_name, email, phone, company, source, property_id,
        budget_min_amount, budget_max_amount, preferred_locations, preferred_property_types,
        preferred_bedrooms, preferred_bathrooms, move_in_date, status, priority,
        lead_score, conversion_probability, estimated_commission_amount, notes,
        next_follow_up_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      auth.userId,
      body.first_name,
      body.last_name,
      body.email || null,
      body.phone ?? null,
      body.company ?? null,
      body.source,
      body.property_id ?? null,
      body.budget_min === undefined ? null : Math.round(body.budget_min * 100),
      body.budget_max === undefined ? null : Math.round(body.budget_max * 100),
      JSON.stringify(body.preferred_locations),
      JSON.stringify(body.preferred_property_types),
      body.preferred_bedrooms ?? null,
      body.preferred_bathrooms ?? null,
      body.move_in_date ?? null,
      body.status,
      body.priority,
      body.lead_score,
      body.conversion_probability,
      body.estimated_commission === undefined ? null : Math.round(body.estimated_commission * 100),
      body.notes ?? null,
      body.next_follow_up_at ?? null,
      nowIso(),
      nowIso(),
    ]
  );

  const created_ = await queryOne<LeadRow>(c.env.DB, `${LEAD_SELECT} WHERE l.id = ?`, [id]);
  return created({ data: created_ ? toLeadDto(created_) : null });
});

leadRoutes.put('/:id', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const existing = await assertLeadAccess(c, id, auth.userId, auth.role);

  const body = validate(leadSchema.partial(), await parseJsonBody(c.req.raw));
  const assignments: string[] = [];
  const params: unknown[] = [];
  const set = (column: string, value: unknown) => {
    assignments.push(`${column} = ?`);
    params.push(value);
  };

  for (const [column, value] of Object.entries({
    first_name: body.first_name,
    last_name: body.last_name,
    email: body.email === '' ? null : body.email,
    phone: body.phone,
    company: body.company,
    source: body.source,
    property_id: body.property_id,
    preferred_bedrooms: body.preferred_bedrooms,
    preferred_bathrooms: body.preferred_bathrooms,
    move_in_date: body.move_in_date,
    status: body.status,
    priority: body.priority,
    lead_score: body.lead_score,
    conversion_probability: body.conversion_probability,
    notes: body.notes,
    next_follow_up_at: body.next_follow_up_at,
  })) {
    if (value !== undefined) set(column, value);
  }

  if (body.budget_min !== undefined) set('budget_min_amount', Math.round(body.budget_min * 100));
  if (body.budget_max !== undefined) set('budget_max_amount', Math.round(body.budget_max * 100));
  if (body.estimated_commission !== undefined) {
    set('estimated_commission_amount', Math.round(body.estimated_commission * 100));
  }
  if (body.preferred_locations !== undefined) {
    set('preferred_locations', JSON.stringify(body.preferred_locations));
  }
  if (body.preferred_property_types !== undefined) {
    set('preferred_property_types', JSON.stringify(body.preferred_property_types));
  }

  if (assignments.length === 0) throw ApiError.badRequest('Nothing to update.');
  assignments.push('updated_at = ?');
  params.push(nowIso(), id);

  await execute(c.env.DB, `UPDATE leads SET ${assignments.join(', ')} WHERE id = ?`, params);

  const updated = await queryOne<LeadRow>(c.env.DB, `${LEAD_SELECT} WHERE l.id = ?`, [id]);
  void existing;
  return ok({ data: updated ? toLeadDto(updated) : null });
});

leadRoutes.patch('/:id/status', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  await assertLeadAccess(c, id, auth.userId, auth.role);

  const body = validate(z.object({ status: z.enum(LEAD_STATUSES) }), await parseJsonBody(c.req.raw));
  await execute(
    c.env.DB,
    `UPDATE leads SET status = ?, last_contacted_at = ?, updated_at = ? WHERE id = ?`,
    [body.status, nowIso(), nowIso(), id]
  );

  const updated = await queryOne<LeadRow>(c.env.DB, `${LEAD_SELECT} WHERE l.id = ?`, [id]);
  return ok({ data: updated ? toLeadDto(updated) : null });
});

leadRoutes.post('/showings', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(
    z.object({
      lead_id: z.string().uuid(),
      property_id: z.string().uuid(),
      scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format.'),
      scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use the HH:MM format.'),
      duration_minutes: z.number().int().min(15).max(480).default(60),
      notes: z.string().trim().max(1000).optional(),
    }),
    await parseJsonBody(c.req.raw)
  );

  const lead = await assertLeadAccess(c, body.lead_id, auth.userId, auth.role);
  const property = await queryOne<{ title: string; address_line1: string; city: string; state: string }>(
    c.env.DB,
    `SELECT title, address_line1, city, state FROM properties WHERE id = ? AND deleted_at IS NULL`,
    [body.property_id]
  );
  if (!property) throw ApiError.notFound('That listing');

  if (Date.parse(body.scheduled_date) < Date.now() - 86_400_000) {
    throw ApiError.validation('Showings cannot be scheduled in the past.', {
      scheduled_date: ['Choose today or a future date.'],
    });
  }

  const id = crypto.randomUUID();
  await execute(
    c.env.DB,
    `INSERT INTO showings (
        id, lead_id, property_id, agent_id, client_name, client_email, client_phone,
        property_address, scheduled_date, scheduled_time, duration_minutes, status, notes,
        created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`,
    [
      id,
      body.lead_id,
      body.property_id,
      auth.userId,
      `${lead.first_name} ${lead.last_name}`,
      lead.email,
      lead.phone,
      `${property.address_line1}, ${property.city}, ${property.state}`,
      body.scheduled_date,
      body.scheduled_time,
      body.duration_minutes,
      body.notes ?? null,
      nowIso(),
      nowIso(),
    ]
  );

  await createNotification(c.env, {
    userId: auth.userId,
    type: 'showing_scheduled',
    title: 'Showing scheduled',
    body: `${property.title} on ${body.scheduled_date} at ${body.scheduled_time}.`,
    resourceType: 'showing',
    resourceId: id,
  });

  const row = await queryOne<ShowingRow>(c.env.DB, `SELECT * FROM showings WHERE id = ?`, [id]);
  return created({ data: row ? toShowingDto(row) : null });
});

leadRoutes.patch('/showings/:id', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const body = validate(z.object({ status: z.enum(SHOWING_STATUSES) }), await parseJsonBody(c.req.raw));

  const showing = await queryOne<ShowingRow & { agent_id: string }>(
    c.env.DB,
    `SELECT * FROM showings WHERE id = ?`,
    [id]
  );
  if (!showing) throw ApiError.notFound('That showing');
  if (showing.agent_id !== auth.userId && auth.role !== 'admin' && auth.role !== 'manager') {
    throw ApiError.forbidden('Only the agent who booked the showing can change it.');
  }

  await execute(c.env.DB, `UPDATE showings SET status = ?, updated_at = ? WHERE id = ?`, [
    body.status,
    nowIso(),
    id,
  ]);

  const updated = await queryOne<ShowingRow>(c.env.DB, `SELECT * FROM showings WHERE id = ?`, [id]);
  return ok({ data: updated ? toShowingDto(updated) : null });
});

leadRoutes.patch('/commissions/:id', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const body = validate(z.object({ status: z.enum(COMMISSION_STATUSES) }), await parseJsonBody(c.req.raw));

  const isPrivileged = auth.role === 'admin' || auth.role === 'manager';
  const commission = await queryOne<CommissionRow & { agent_id: string }>(
    c.env.DB,
    `SELECT * FROM commissions WHERE id = ?`,
    [id]
  );
  if (!commission) throw ApiError.notFound('That commission');
  if (commission.agent_id !== auth.userId && !isPrivileged) {
    throw ApiError.forbidden('You can only update your own commissions.');
  }

  await execute(c.env.DB, `UPDATE commissions SET status = ?, updated_at = ? WHERE id = ?`, [
    body.status,
    nowIso(),
    id,
  ]);
  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'commission.status_changed',
    resourceType: 'commission',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
    metadata: { status: body.status },
  });

  const updated = await queryOne<CommissionRow>(c.env.DB, `SELECT * FROM commissions WHERE id = ?`, [id]);
  return ok({ data: updated ? toCommissionDto(updated) : null });
});

async function assertLeadAccess(c: AppContext, leadId: string, userId: string, role: string): Promise<LeadRow> {
  const lead = await queryOne<LeadRow>(c.env.DB, `SELECT * FROM leads WHERE id = ?`, [leadId]);
  if (!lead) throw ApiError.notFound('That lead');
  if (lead.agent_id !== userId && role !== 'admin' && role !== 'manager') {
    throw ApiError.notFound('That lead');
  }
  return lead;
}
