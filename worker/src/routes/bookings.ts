import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth, requireParam } from '../http/context';
import { created, ok } from '../http/responses';
import { validate, isoDateSchema, parseJsonBody } from '../http/validate';
import { withRateLimit } from '../http/middleware';
import { ApiError } from '../lib/errors';
import { execute, nowIso, queryAll, queryOne } from '../repositories/db';
import { properties } from '../repositories/properties';
import { createNotification } from '../services/notifications';
import { recordAudit } from '../services/notifications';
import { toBookingDto, type BookingRow } from '../domain/booking';

const createSchema = z
  .object({
    property_id: z.string().uuid('Choose a property.'),
    start_date: isoDateSchema,
    end_date: isoDateSchema.optional(),
    message: z.string().trim().max(1000).optional(),
  })
  .refine((value) => !value.end_date || value.end_date > value.start_date, {
    message: 'The end date must be after the start date.',
    path: ['end_date'],
  });

const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'cancelled']),
  reason: z.string().trim().max(500).optional(),
});

export const bookingRoutes = new Hono<AppEnv>();

/** Bookings visible to the caller: as tenant, as landlord, or as manager. */
bookingRoutes.get('/', async (c: AppContext) => {
  const auth = currentAuth(c);
  const rows = await queryAll<BookingRow>(
    c.env.DB,
    `SELECT b.*, p.title AS property_title, p.address_line1 AS property_address, p.city AS property_city,
            t.name AS tenant_name, l.name AS landlord_name
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN users t ON t.id = b.tenant_id
       JOIN users l ON l.id = b.landlord_id
      WHERE (b.tenant_id = ? OR b.landlord_id = ?)
      ORDER BY b.created_at DESC
      LIMIT 200`,
    [auth.userId, auth.userId]
  );
  return ok({ data: rows.map(toBookingDto) });
});

bookingRoutes.post('/', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const body = validate(createSchema, await parseJsonBody(c.req.raw));

  const property = await properties.byId(c.env.DB, body.property_id);
  if (!property) throw ApiError.notFound('That listing');
  if (property.status !== 'available') {
    throw ApiError.conflict('This listing is not currently accepting bookings.');
  }
  if (property.landlord_id === auth.userId) {
    throw ApiError.conflict('You cannot book your own listing.');
  }

  const start = Date.parse(body.start_date);
  if (start < Date.now() - 86_400_000) {
    throw ApiError.validation('The start date cannot be in the past.', {
      start_date: ['Choose today or a future date.'],
    });
  }

  // The partial unique index blocks duplicates at the database level; this
  // check exists to return a friendly message instead of a constraint error.
  const existing = await queryOne<{ id: string }>(
    c.env.DB,
    `SELECT id FROM bookings
      WHERE property_id = ? AND tenant_id = ? AND status IN ('pending', 'approved')`,
    [body.property_id, auth.userId]
  );
  if (existing) {
    throw ApiError.conflict('You already have an active booking request for this listing.');
  }

  const id = crypto.randomUUID();
  await execute(
    c.env.DB,
    `INSERT INTO bookings (
        id, property_id, tenant_id, landlord_id, start_date, end_date, message,
        status, monthly_rent_amount, deposit_amount, currency, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    [
      id,
      body.property_id,
      auth.userId,
      property.landlord_id,
      body.start_date,
      body.end_date ?? null,
      body.message ?? null,
      property.price_amount,
      property.deposit_amount,
      property.currency,
      nowIso(),
      nowIso(),
    ]
  );

  await createNotification(c.env, {
    userId: property.landlord_id,
    type: 'booking_requested',
    title: 'New booking request',
    body: `Someone requested to book ${property.title}.`,
    resourceType: 'booking',
    resourceId: id,
  });
  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'booking.created',
    resourceType: 'booking',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
  });

  const row = await bookingWithJoins(c.env.DB, id);
  return created({ data: row ? toBookingDto(row) : null });
});

/**
 * Landlord decision (or tenant cancellation).
 *
 * Only the landlord may approve/reject, and only the tenant may cancel — the
 * endpoint checks ownership rather than trusting a role alone.
 */
bookingRoutes.post('/:id/decision', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const body = validate(decisionSchema, await parseJsonBody(c.req.raw));

  const booking = await queryOne<BookingRow>(c.env.DB, `SELECT * FROM bookings WHERE id = ?`, [id]);
  if (!booking) throw ApiError.notFound('That booking');

  const isTenant = booking.tenant_id === auth.userId;
  const isLandlord = booking.landlord_id === auth.userId;

  if (body.decision === 'cancelled') {
    if (!isTenant && !isLandlord) throw ApiError.forbidden('Only the people on this booking can cancel it.');
  } else if (!isLandlord) {
    throw ApiError.forbidden('Only the landlord can approve or reject a booking.');
  }

  if (booking.status !== 'pending') {
    throw ApiError.conflict(`This booking has already been ${booking.status}.`);
  }

  await execute(
    c.env.DB,
    `UPDATE bookings SET status = ?, decision_reason = ?, decided_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'`,
    [body.decision, body.reason ?? null, nowIso(), nowIso(), id]
  );

  // Guard against a concurrent decision: confirm our update is the one that won.
  const updated = await queryOne<BookingRow>(c.env.DB, `SELECT * FROM bookings WHERE id = ?`, [id]);
  if (!updated || updated.status !== body.decision) {
    throw ApiError.conflict('This booking was just updated by someone else. Refresh and try again.');
  }

  const notifyUserId = isLandlord ? booking.tenant_id : booking.landlord_id;
  await createNotification(c.env, {
    userId: notifyUserId,
    type: `booking_${body.decision}`,
    title:
      body.decision === 'approved'
        ? 'Booking approved'
        : body.decision === 'rejected'
          ? 'Booking declined'
          : 'Booking cancelled',
    body: body.reason ?? undefined,
    resourceType: 'booking',
    resourceId: id,
  });

  if (body.decision === 'approved') {
    // An approved booking takes the listing off the market.
    await execute(c.env.DB, `UPDATE properties SET status = 'occupied', updated_at = ? WHERE id = ?`, [
      nowIso(),
      booking.property_id,
    ]);
  }

  await recordAudit(c.env, {
    actorId: auth.userId,
    action: `booking.${body.decision}`,
    resourceType: 'booking',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
    metadata: { reason: body.reason ?? null },
  });

  const row = await bookingWithJoins(c.env.DB, id);
  return ok({ data: row ? toBookingDto(row) : null });
});

async function bookingWithJoins(db: D1Database, id: string): Promise<BookingRow | null> {
  return queryOne<BookingRow>(
    db,
    `SELECT b.*, p.title AS property_title, p.address_line1 AS property_address, p.city AS property_city,
            t.name AS tenant_name, l.name AS landlord_name
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN users t ON t.id = b.tenant_id
       JOIN users l ON l.id = b.landlord_id
      WHERE b.id = ?`,
    [id]
  );
}
