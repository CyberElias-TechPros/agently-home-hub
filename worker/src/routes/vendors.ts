import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth, requireParam } from '../http/context';
import { created, ok } from '../http/responses';
import { validate, parseJsonBody, paginationSchema, validateQuery } from '../http/validate';
import { withRateLimit } from '../http/middleware';
import { ApiError } from '../lib/errors';
import { execute, nowIso, queryAll, queryOne } from '../repositories/db';
import { toContractorDto, type ContractorRow, type VendorBookingRow } from '../domain/vendor';
import { createNotification } from '../services/notifications';

const bookingSchema = z.object({
  contractor_id: z.string().uuid('Choose a service provider.'),
  maintenance_request_id: z.string().uuid().optional(),
  scheduled_for: z.string().optional(),
  description: z.string().trim().min(5, 'Describe the work needed.').max(2000),
  quoted_amount: z.number().min(0).max(100_000_000).optional(),
});

const reviewSchema = z.object({
  contractor_id: z.string().uuid(),
  rating: z.number().int().min(1, 'Rate between 1 and 5.').max(5, 'Rate between 1 and 5.'),
  comment: z.string().trim().max(2000).optional(),
});

export const vendorRoutes = new Hono<AppEnv>();

vendorRoutes.get('/', async (c: AppContext) => {
  const query = validateQuery(
    paginationSchema.extend({
      category: z.string().trim().max(40).optional(),
      q: z.string().trim().max(120).optional(),
    }),
    new URL(c.req.url).searchParams
  );

  const where: string[] = [];
  const params: unknown[] = [];

  if (query.category) {
    where.push(`EXISTS (SELECT 1 FROM json_each(categories) WHERE lower(json_each.value) = lower(?))`);
    params.push(query.category);
  }
  if (query.q) {
    where.push('(lower(business_name) LIKE lower(?) OR lower(description) LIKE lower(?))');
    const needle = `%${query.q}%`;
    params.push(needle, needle);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await queryAll<ContractorRow>(
    c.env.DB,
    `SELECT * FROM contractors ${whereSql}
      ORDER BY verified DESC, rating DESC, review_count DESC
      LIMIT ? OFFSET ?`,
    [...params, query.per_page, (query.page - 1) * query.per_page]
  );

  return ok({ data: rows.map(toContractorDto) });
});

vendorRoutes.get('/bookings', async (c: AppContext) => {
  const auth = currentAuth(c);
  const rows = await queryAll<VendorBookingRow & { business_name: string }>(
    c.env.DB,
    `SELECT v.*, c.business_name
       FROM vendor_bookings v
       JOIN contractors c ON c.id = v.contractor_id
      WHERE v.requested_by = ?
      ORDER BY v.created_at DESC
      LIMIT 100`,
    [auth.userId]
  );
  return ok({ data: rows.map((row) => toVendorBookingDto(row)) });
});

vendorRoutes.post('/bookings', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(bookingSchema, await parseJsonBody(c.req.raw));

  const contractor = await queryOne<ContractorRow & { user_id: string | null }>(
    c.env.DB,
    `SELECT * FROM contractors WHERE id = ?`,
    [body.contractor_id]
  );
  if (!contractor) throw ApiError.notFound('That service provider');

  const id = crypto.randomUUID();
  await execute(
    c.env.DB,
    `INSERT INTO vendor_bookings (
        id, contractor_id, requested_by, maintenance_request_id, scheduled_for,
        description, status, quoted_amount, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?)`,
    [
      id,
      body.contractor_id,
      auth.userId,
      body.maintenance_request_id ?? null,
      body.scheduled_for ?? null,
      body.description,
      body.quoted_amount === undefined ? null : Math.round(body.quoted_amount * 100),
      nowIso(),
      nowIso(),
    ]
  );

  if (contractor.user_id) {
    await createNotification(c.env, {
      userId: contractor.user_id,
      type: 'vendor_booking_requested',
      title: 'New service request',
      body: `${contractor.business_name}: ${body.description.slice(0, 100)}`,
      resourceType: 'vendor_booking',
      resourceId: id,
    });
  }

  return created({ data: { id, status: 'requested', business_name: contractor.business_name } });
});

/**
 * Leaves a review and recomputes the contractor's aggregate rating.
 *
 * The unique index on (contractor, reviewer) makes this idempotent per user;
 * a repeat submission updates the existing review instead of stacking.
 */
vendorRoutes.post('/reviews', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(reviewSchema, await parseJsonBody(c.req.raw));

  const contractor = await queryOne<{ id: string }>(c.env.DB, `SELECT id FROM contractors WHERE id = ?`, [
    body.contractor_id,
  ]);
  if (!contractor) throw ApiError.notFound('That service provider');

  await execute(
    c.env.DB,
    `INSERT INTO vendor_reviews (id, contractor_id, reviewer_id, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (contractor_id, reviewer_id)
     DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = excluded.created_at`,
    [crypto.randomUUID(), body.contractor_id, auth.userId, body.rating, body.comment ?? null, nowIso()]
  );

  await execute(
    c.env.DB,
    `UPDATE contractors
        SET rating = (SELECT COALESCE(AVG(rating), 0) FROM vendor_reviews WHERE contractor_id = ?),
            review_count = (SELECT COUNT(*) FROM vendor_reviews WHERE contractor_id = ?),
            updated_at = ?
      WHERE id = ?`,
    [body.contractor_id, body.contractor_id, nowIso(), body.contractor_id]
  );

  return created({ data: { contractor_id: body.contractor_id, rating: body.rating } });
});

vendorRoutes.get('/:id/reviews', async (c: AppContext) => {
  const id = requireParam(c, 'id');
  const rows = await queryAll<Record<string, unknown>>(
    c.env.DB,
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS reviewer_name
       FROM vendor_reviews r
       JOIN users u ON u.id = r.reviewer_id
      WHERE r.contractor_id = ?
      ORDER BY r.created_at DESC
      LIMIT 50`,
    [id]
  );
  return ok({ data: rows });
});

function toVendorBookingDto(row: VendorBookingRow & { business_name: string }) {
  return {
    id: row.id,
    contractor_id: row.contractor_id,
    business_name: row.business_name,
    requested_by: row.requested_by,
    maintenance_request_id: row.maintenance_request_id,
    scheduled_for: row.scheduled_for,
    description: row.description,
    status: row.status,
    quoted_amount: row.quoted_amount === null ? null : row.quoted_amount / 100,
    currency: row.currency,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
