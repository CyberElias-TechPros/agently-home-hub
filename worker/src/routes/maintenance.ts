import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth, requireParam } from '../http/context';
import { created, ok } from '../http/responses';
import { validate, parseJsonBody, paginationSchema, validateQuery } from '../http/validate';
import { withRateLimit } from '../http/middleware';
import { ApiError } from '../lib/errors';
import { execute, nowIso, queryAll, queryOne } from '../repositories/db';
import { properties } from '../repositories/properties';
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  RESPONSE_TARGET_HOURS,
  toMaintenanceDto,
  type MaintenanceRow,
} from '../domain/maintenance';
import { createNotification, recordAudit } from '../services/notifications';

const createSchema = z.object({
  property_id: z.string().uuid('Choose a property.'),
  title: z.string().trim().min(4, 'Describe the problem briefly.').max(160),
  description: z.string().trim().min(10, 'Give a little more detail so it can be triaged.').max(5000),
  category: z.enum(MAINTENANCE_CATEGORIES),
  priority: z.enum(MAINTENANCE_PRIORITIES).default('medium'),
  area_affected: z.string().trim().max(120).optional(),
  access_instructions: z.string().trim().max(500).optional(),
  images: z.array(z.string().url()).max(10).default([]),
});

const updateSchema = z.object({
  status: z.enum(MAINTENANCE_STATUSES).optional(),
  priority: z.enum(MAINTENANCE_PRIORITIES).optional(),
  contractor_id: z.string().uuid().nullable().optional(),
  landlord_notes: z.string().trim().max(2000).optional(),
  contractor_notes: z.string().trim().max(2000).optional(),
  estimated_cost: z.number().min(0).max(100_000_000).optional(),
  actual_cost: z.number().min(0).max(100_000_000).optional(),
});

/** Only these transitions are meaningful; anything else is a client bug. */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['assigned', 'in_progress', 'rejected', 'cancelled'],
  assigned: ['in_progress', 'cancelled', 'rejected'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
};

export const maintenanceRoutes = new Hono<AppEnv>();

maintenanceRoutes.get('/', async (c: AppContext) => {
  const auth = currentAuth(c);
  const query = validateQuery(
    paginationSchema.extend({
      status: z.enum(MAINTENANCE_STATUSES).optional(),
      property_id: z.string().uuid().optional(),
    }),
    new URL(c.req.url).searchParams
  );

  const where = ['(m.tenant_id = ? OR m.landlord_id = ? OR m.contractor_id = ?)'];
  const params: unknown[] = [auth.userId, auth.userId, auth.userId];

  if (query.status) {
    where.push('m.status = ?');
    params.push(query.status);
  }
  if (query.property_id) {
    where.push('m.property_id = ?');
    params.push(query.property_id);
  }

  const rows = await queryAll<MaintenanceRow>(
    c.env.DB,
    `SELECT m.*, p.title AS property_title, p.address_line1 AS property_address,
            t.name AS tenant_name, l.name AS landlord_name
       FROM maintenance_requests m
       JOIN properties p ON p.id = m.property_id
       JOIN users t ON t.id = m.tenant_id
       JOIN users l ON l.id = m.landlord_id
      WHERE ${where.join(' AND ')}
      ORDER BY
        CASE m.priority WHEN 'emergency' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        m.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, query.per_page, (query.page - 1) * query.per_page]
  );

  return ok({ data: rows.map(toMaintenanceDto) });
});

maintenanceRoutes.post('/', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(createSchema, await parseJsonBody(c.req.raw));

  const property = await properties.byId(c.env.DB, body.property_id);
  if (!property) throw ApiError.notFound('That listing');

  // A tenant may only raise a request against a property they actually occupy.
  const isTenantOfProperty = await queryOne<{ id: string }>(
    c.env.DB,
    `SELECT id FROM bookings
      WHERE property_id = ? AND tenant_id = ? AND status = 'approved'`,
    [body.property_id, auth.userId]
  );
  const isLandlord = property.landlord_id === auth.userId;
  if (!isTenantOfProperty && !isLandlord) {
    throw ApiError.forbidden('You can only raise maintenance requests for a home you rent or own.');
  }

  const id = crypto.randomUUID();
  await execute(
    c.env.DB,
    `INSERT INTO maintenance_requests (
        id, property_id, tenant_id, landlord_id, title, description, category, priority, status,
        area_affected, access_instructions, images, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    [
      id,
      body.property_id,
      auth.userId,
      property.landlord_id,
      body.title,
      body.description,
      body.category,
      body.priority,
      body.area_affected ?? null,
      body.access_instructions ?? null,
      JSON.stringify(body.images),
      nowIso(),
      nowIso(),
    ]
  );

  await logHistory(c, id, 'created', null, 'pending', `Request raised (${body.priority} priority).`);

  await createNotification(c.env, {
    userId: property.landlord_id,
    type: 'maintenance_requested',
    title: 'New maintenance request',
    body: `${body.title} — ${body.priority} priority.`,
    resourceType: 'maintenance_request',
    resourceId: id,
  });

  const row = await fullRow(c.env.DB, id);
  return created({
    data: row
      ? {
          ...toMaintenanceDto(row),
          // Honest, deterministic expectation derived from priority.
          response_target_hours: RESPONSE_TARGET_HOURS[body.priority],
        }
      : null,
  });
});

maintenanceRoutes.patch('/:id', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const body = validate(updateSchema, await parseJsonBody(c.req.raw));

  const existing = await queryOne<MaintenanceRow>(
    c.env.DB,
    `SELECT * FROM maintenance_requests WHERE id = ?`,
    [id]
  );
  if (!existing) throw ApiError.notFound('That maintenance request');

  const isLandlord = existing.landlord_id === auth.userId;
  const isTenant = existing.tenant_id === auth.userId;
  const isContractor = existing.contractor_id === auth.userId;
  const isStaff = auth.role === 'admin' || auth.role === 'manager';

  if (!isLandlord && !isTenant && !isContractor && !isStaff) {
    throw ApiError.forbidden('You are not involved in this maintenance request.');
  }

  // Status and cost are landlord decisions; the contractor reports progress and
  // notes; the tenant may only cancel their own request.
  if (body.status !== undefined) {
    if (body.status === 'cancelled') {
      if (!isTenant && !isLandlord && !isStaff) {
        throw ApiError.forbidden('Only the tenant or landlord can cancel this request.');
      }
    } else if (!isLandlord && !isContractor && !isStaff) {
      throw ApiError.forbidden('Only the landlord or assigned contractor can change the status.');
    }

    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(body.status)) {
      throw ApiError.conflict(
        `A request that is ${existing.status.replace('_', ' ')} cannot become ${body.status.replace('_', ' ')}.`
      );
    }
  }

  if ((body.estimated_cost !== undefined || body.actual_cost !== undefined) && !isLandlord && !isStaff) {
    throw ApiError.forbidden('Only the landlord can record costs.');
  }

  const assignments: string[] = [];
  const params: unknown[] = [];
  const set = (column: string, value: unknown) => {
    assignments.push(`${column} = ?`);
    params.push(value);
  };

  if (body.status !== undefined) {
    set('status', body.status);
    if (body.status === 'in_progress' && !existing.assigned_at) set('assigned_at', nowIso());
    if (body.status === 'completed') set('completed_at', nowIso());
  }
  if (body.priority !== undefined) set('priority', body.priority);
  if (body.contractor_id !== undefined) {
    set('contractor_id', body.contractor_id);
    if (body.contractor_id) set('assigned_at', existing.assigned_at ?? nowIso());
  }
  if (body.landlord_notes !== undefined && (isLandlord || isStaff)) set('landlord_notes', body.landlord_notes);
  if (body.contractor_notes !== undefined && (isContractor || isLandlord || isStaff)) {
    set('contractor_notes', body.contractor_notes);
  }
  if (body.estimated_cost !== undefined) set('estimated_cost_amount', Math.round(body.estimated_cost * 100));
  if (body.actual_cost !== undefined) set('actual_cost_amount', Math.round(body.actual_cost * 100));

  if (assignments.length === 0) throw ApiError.badRequest('Nothing to update.');

  assignments.push('updated_at = ?');
  params.push(nowIso(), id);

  await execute(
    c.env.DB,
    `UPDATE maintenance_requests SET ${assignments.join(', ')} WHERE id = ?`,
    params
  );

  if (body.status && body.status !== existing.status) {
    await logHistory(c, id, 'status_changed', existing.status, body.status, body.landlord_notes ?? null);
    const notifyUserId = isLandlord ? existing.tenant_id : existing.landlord_id;
    await createNotification(c.env, {
      userId: notifyUserId,
      type: 'maintenance_status_changed',
      title: 'Maintenance update',
      body: `"${existing.title}" is now ${body.status.replace('_', ' ')}.`,
      resourceType: 'maintenance_request',
      resourceId: id,
    });
  }

  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'maintenance.updated',
    resourceType: 'maintenance_request',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
    metadata: { changed: Object.keys(body) },
  });

  const row = await fullRow(c.env.DB, id);
  return ok({ data: row ? toMaintenanceDto(row) : null });
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function logHistory(
  c: AppContext,
  requestId: string,
  action: string,
  oldStatus: string | null,
  newStatus: string | null,
  notes: string | null
): Promise<void> {
  await execute(
    c.env.DB,
    `INSERT INTO maintenance_history (id, maintenance_request_id, action, old_status, new_status, changed_by, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), requestId, action, oldStatus, newStatus, c.get('auth')?.userId ?? null, notes, nowIso()]
  );
}

function fullRow(db: D1Database, id: string) {
  return queryOne<MaintenanceRow>(
    db,
    `SELECT m.*, p.title AS property_title, p.address_line1 AS property_address,
            t.name AS tenant_name, l.name AS landlord_name
       FROM maintenance_requests m
       JOIN properties p ON p.id = m.property_id
       JOIN users t ON t.id = m.tenant_id
       JOIN users l ON l.id = m.landlord_id
      WHERE m.id = ?`,
    [id]
  );
}
