/**
 * Bookings: availability check, create, list (tenant/landlord), status
 * transitions, cancel, payment via mock gateway ledger.
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { ApiError } from '../errors';
import { uuid, nowIso } from '../crypto';
import { requireAuth, requireRole, currentUserId } from '../middleware';

type Ctx = { Bindings: Env; Variables: Variables };

export const bookings = new Hono<Ctx>();

const VALID_STATUS = ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'];
const TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
};

function toPublic(row: any): Record<string, unknown> {
  return {
    id: row.id,
    propertyId: row.property_id,
    tenantId: row.tenant_id,
    landlordId: row.landlord_id ?? null,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    message: row.message ?? null,
    totalPrice: row.total_price,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// GET /api/bookings/availability/:propertyId?startDate&endDate
// ---------------------------------------------------------------------------
bookings.get('/availability/:propertyId', async (c) => {
  const { propertyId } = c.req.param();
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  if (!startDate || !endDate) throw ApiError.badRequest('startDate and endDate are required');

  const conflicting = await c.env.DB.prepare(
    `SELECT id, start_date, end_date, status FROM bookings
     WHERE property_id = ? AND status IN ('pending','confirmed')
       AND NOT (end_date <= ? OR start_date >= ?)`,
  ).bind(propertyId, startDate, endDate).all();

  const available = conflicting.results.length === 0;
  return c.json({
    success: true,
    data: { available, conflictingBookings: conflicting.results },
  });
});

// ---------------------------------------------------------------------------
// POST /api/bookings
// ---------------------------------------------------------------------------
bookings.post('/', requireAuth, requireRole('tenant', 'manager'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { propertyId, startDate, endDate, message = '' } = body;
  if (!propertyId || !startDate || !endDate) {
    throw ApiError.badRequest('propertyId, startDate and endDate are required');
  }

  const prop = await c.env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(propertyId).first();
  if (!prop) throw ApiError.notFound('Property not found');
  if (prop.status !== 'available') {
    throw ApiError.conflict('This property is not currently available for booking');
  }

  const overlap = await c.env.DB.prepare(
    `SELECT id FROM bookings WHERE property_id = ? AND status IN ('pending','confirmed')
      AND NOT (end_date <= ? OR start_date >= ?)`,
  ).bind(propertyId, startDate, endDate).first();
  if (overlap) throw ApiError.conflict('Dates overlap an existing booking');

  const bookingId = uuid();
  const totalPrice = Number(prop.price) || 0;
  await c.env.DB.prepare(
    `INSERT INTO bookings (id, property_id, tenant_id, landlord_id, start_date, end_date, status, message, total_price)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).bind(bookingId, propertyId, currentUserId(c), prop.landlord_id, startDate, endDate, message, totalPrice).run();

  // notify landlord
  const noteId = uuid();
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, link)
     VALUES (?, ?, 'booking', 'New booking request', ?, ?)`,
  ).bind(noteId, prop.landlord_id, `A new booking request was received for "${prop.title}".`, `/dashboard`).run();

  const row = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(bookingId).first();
  return c.json({ success: true, data: toPublic(row) }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/bookings (mine; landlords see their properties' bookings)
// ---------------------------------------------------------------------------
bookings.get('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const rows = user.role === 'landlord' || user.role === 'manager' || user.role === 'admin'
    ? await c.env.DB.prepare(
        `SELECT b.* FROM bookings b JOIN properties p ON p.id = b.property_id WHERE p.landlord_id = ? ORDER BY b.created_at DESC`,
      ).bind(user.sub).all()
    : await c.env.DB.prepare('SELECT * FROM bookings WHERE tenant_id = ? ORDER BY created_at DESC')
      .bind(user.sub).all();

  return c.json({ success: true, data: rows.results.map(toPublic) });
});

// ---------------------------------------------------------------------------
// PUT /api/bookings/:id/status  (landlord approve/reject, tenant cancel, etc.)
// ---------------------------------------------------------------------------
bookings.put('/:id/status', requireAuth, async (c) => {
  const id_ = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const status = body.status;
  if (!VALID_STATUS.includes(status)) throw ApiError.badRequest('Invalid status');

  const row = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id_).first();
  if (!row) throw ApiError.notFound('Booking not found');

  const user = c.get('user')!;
  const isParty = row.tenant_id === user.sub || row.landlord_id === user.sub;
  const isStaff = ['admin', 'manager'].includes(user.role);
  if (!isParty && !isStaff) throw ApiError.forbidden('You cannot modify this booking');

  const allowed = TRANSITIONS[row.status as string] ?? [];
  if (!allowed.includes(status)) {
    throw ApiError.conflict(`Cannot move booking from ${row.status} to ${status}`);
  }

  // authorization per transition
  const tenantCanceling = (status === 'cancelled') && row.tenant_id === user.sub && row.status === 'pending';
  const landlordDeciding = (status === 'confirmed' || status === 'rejected') &&
    (row.landlord_id === user.sub || isStaff);
  const completing = status === 'completed' && (row.landlord_id === user.sub || isStaff);
  if (!tenantCanceling && !landlordDeciding && !completing && !isStaff) {
    throw ApiError.forbidden('You are not authorized to perform this transition');
  }

  await c.env.DB.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, nowIso(), id_).run();

  // notify tenant on decision
  if (landlordDeciding) {
    const noteId = uuid();
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, link)
       VALUES (?, ?, 'booking', ?, ?, ?)`,
    ).bind(noteId, row.tenant_id,
      status === 'confirmed' ? 'Booking approved' : 'Booking declined',
      status === 'confirmed' ? 'Your booking request was approved. Next step: complete the lease.' : 'Your booking request was declined.',
      '/bookings').run();
  }

  const updated = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id_).first();
  return c.json({ success: true, data: toPublic(updated) });
});

// ---------------------------------------------------------------------------
// POST /api/bookings/:id/cancel (tenant convenience)
// ---------------------------------------------------------------------------
bookings.post('/:id/cancel', requireAuth, async (c) => {
  const id_ = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id_).first();
  if (!row) throw ApiError.notFound('Booking not found');

  const user = c.get('user')!;
  const isStaff = ['admin', 'manager'].includes(user.role);
  if (row.tenant_id !== user.sub && row.landlord_id !== user.sub && !isStaff) {
    throw ApiError.forbidden('You cannot cancel this booking');
  }
  if (!['pending', 'confirmed'].includes(row.status as string)) {
    throw ApiError.conflict('Only pending or confirmed bookings can be cancelled');
  }

  await c.env.DB.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?')
    .bind('cancelled', nowIso(), id_).run();

  const updated = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id_).first();
  return c.json({ success: true, data: toPublic(updated) });
});

// ---------------------------------------------------------------------------
// Payments (ledger entries tied to bookings)
// ---------------------------------------------------------------------------
bookings.get('/:id/payments', requireAuth, async (c) => {
  const id_ = c.req.param('id');
  const user = c.get('user')!;
  const booking = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id_).first();
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.tenant_id !== user.sub && booking.landlord_id !== user.sub && user.role !== 'admin') {
    throw ApiError.forbidden('Forbidden');
  }
  const rows = await c.env.DB.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC')
    .bind(id_).all();
  return c.json({ success: true, data: rows.results });
});

bookings.post('/:id/pay', requireAuth, async (c) => {
  const id_ = c.req.param('id');
  const user = c.get('user')!;
  const booking = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id_).first();
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.tenant_id !== user.sub) throw ApiError.forbidden('Only the tenant can pay for this booking');
  if (booking.status !== 'confirmed') {
    throw ApiError.conflict('Booking must be confirmed before payment');
  }

  const body = await c.req.json().catch(() => ({}));
  const amount = Number(body.amount ?? booking.total_price);
  if (!Number.isFinite(amount) || amount <= 0) throw ApiError.badRequest('Invalid amount');

  const payId = uuid();
  // Simulated gateway capture (provider binding swaps in real charge later).
  const providerRef = `sim_${payId.slice(0, 12)}`;
  await c.env.DB.prepare(
    `INSERT INTO payments (id, user_id, booking_id, amount, status, provider, provider_ref, description)
     VALUES (?, ?, ?, ?, 'succeeded', 'sim_gateway', ?, ?)`,
  ).bind(payId, user.sub, id_, amount, providerRef, body.description ?? 'Booking payment').run();

  const pay = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(payId).first();
  return c.json({ success: true, data: pay }, 201);
});
