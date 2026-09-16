// Booking routes: availability checks, create/update/cancel bookings, payments.

import { ok, created, badRequest, unauthorized, forbidden, notFound, parseJson, currentUser, isDateStr } from '../lib/http.js';
import { all, get, run, newId, now } from '../db/db.js';
import { createBookingPayment, verifyPaystack } from '../lib/payments.js';
import config from '../config.js';

export async function handleBookings(req, res, parts) {
  if (req.method === 'GET' && parts.length === 0) return listBookings(req, res);
  if (req.method === 'GET' && parts.length === 2 && parts[0] === 'availability') return checkAvailability(req, res, parts[1]);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'tenants') return listTenants(req, res);
  if (req.method === 'GET' && parts.length === 2 && parts[0] === 'mine') return listBookings(req, res); // alias used by some clients
  if (req.method === 'POST' && parts.length === 0) return createBooking(req, res);
  if (req.method === 'POST' && parts.length === 2 && parts[1] === 'pay') return payBooking(req, res, parts[0]);
  if (req.method === 'POST' && parts.length === 2 && parts[1] === 'verify') return verifyBookingPayment(req, res, parts[0]);
  if (req.method === 'PUT' && parts.length === 2 && parts[0] === 'status') return updateStatus(req, res, parts[1]);
  if (req.method === 'PUT' && parts.length === 2 && parts[0] === 'cancel') return cancelBookingRoute(req, res, parts[1]);
  if (req.method === 'PUT' && parts.length === 1) return updateBooking(req, res, parts[0]);
  return notFound(res, 'Booking route not found');
}

function rowToBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    propertyType: row.property_type,
    propertyCity: row.property_city,
    propertyState: row.property_state,
    propertyImages: row.property_images ? safeJson(row.property_images, []) : [],
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tenantEmail: row.tenant_email,
    landlordId: row.landlord_id,
    landlordName: row.landlord_name,
    landlordEmail: row.landlord_email,
    startDate: row.start_date,
    endDate: row.end_date,
    monthlyRent: row.monthly_rent,
    securityDeposit: row.security_deposit,
    fee: row.fee,
    status: row.status,
    paymentStatus: row.payment_status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeJson(v, fb) {
  if (v == null || v === '') return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

const BOOKING_SELECT = `
  SELECT b.*,
    p.title AS property_title, p.type AS property_type, p.city AS property_city,
    p.state AS property_state, p.images AS property_images,
    t.name AS tenant_name, t.email AS tenant_email,
    l.name AS landlord_name, l.email AS landlord_email
  FROM bookings b
  JOIN properties p ON p.id = b.property_id
  JOIN users t ON t.id = b.tenant_id
  JOIN users l ON l.id = b.landlord_id
`;

async function listBookings(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);

  // Tenants see their bookings; landlords/managers/admin see inbound ones.
  const params = [];
  let where;
  if (user.role === 'tenant') {
    where = 'WHERE b.tenant_id = ?';
    params.push(user.id);
  } else if (user.role === 'agent') {
    where = 'WHERE 1 = 0'; // agents don't have bookings in this model
  } else {
    where = 'WHERE b.landlord_id = ?';
    params.push(user.id);
  }
  if (req.query.status) {
    where += ' AND b.status = ?';
    params.push(String(req.query.status));
  }

  const rows = await all(`${BOOKING_SELECT} ${where} ORDER BY b.created_at DESC`, params);
  const total = rows.length;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const offset = (page - 1) * limit;
  const items = rows.slice(offset, offset + limit).map(rowToBooking);

  return ok(res, { items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), hasMore: page * limit < total } });
}

async function listTenants(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  if (user.role === 'tenant') return forbidden(res, 'Only landlords and admins can view tenant lists');

  let where = 'WHERE 1 = 1';
  const params = [];
  if (user.role !== 'admin' && user.role !== 'manager') {
    where = 'WHERE b.landlord_id = ?';
    params.push(user.id);
  }
  const rows = await all(
    `SELECT DISTINCT u.id, u.name, u.email, u.role, u.created_at
       FROM bookings b
       JOIN users u ON u.id = b.tenant_id
       ${where} AND b.status IN ('confirmed','active')
       ORDER BY u.created_at DESC`,
    params
  );
  return ok(res, {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      createdAt: r.created_at,
      isActive: true,
    })),
  });
}

async function checkAvailability(req, res, propertyId) {
  const { startDate, endDate } = req.query || {};
  if (!startDate || !endDate) return badRequest(res, 'startDate and endDate query params are required');
  if (!isDateStr(startDate) || !isDateStr(endDate)) return badRequest(res, 'Dates must be valid YYYY-MM-DD values');
  if (startDate >= endDate) return badRequest(res, 'End date must be after start date');

  const prop = await get('SELECT id, status, price, landlord_id FROM properties WHERE id = ?', [propertyId]);
  if (!prop) return notFound(res, 'Property not found');
  if (prop.status === 'occupied') {
    return ok(res, { available: false, reason: 'This property is currently occupied.' });
  }

  const conflicts = await all(
    `SELECT id, start_date, end_date, status FROM bookings
     WHERE property_id = ? AND status IN ('pending','confirmed')
       AND start_date < ? AND end_date > ?`,
    [propertyId, endDate, startDate]
  );
  return ok(res, { available: conflicts.length === 0, conflicts: conflicts.map((c) => ({ id: c.id, startDate: c.start_date, endDate: c.end_date, status: c.status })) });
}

function monthsBetween(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  let m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() > s.getDate()) m += 1;
  return Math.max(1, m);
}

async function createBooking(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  if (user.role === 'landlord' || user.role === 'manager') {
    return forbidden(res, 'Landlords cannot book their own listings as tenants');
  }
  const body = parseJson(req);
  if (!body) return badRequest(res, 'Invalid JSON body');
  const { propertyId, startDate, endDate, notes, payNow = false } = body;

  if (!propertyId) return badRequest(res, 'propertyId is required');
  if (!startDate || !endDate) return badRequest(res, 'Move-in and move-out dates are required');
  if (!isDateStr(startDate) || !isDateStr(endDate)) return badRequest(res, 'Dates must be valid YYYY-MM-DD values');
  if (startDate >= endDate) return badRequest(res, 'Move-out date must be after move-in date');

  const prop = await get('SELECT * FROM properties WHERE id = ?', [propertyId]);
  if (!prop) return notFound(res, 'Property not found');
  if (prop.landlord_id === user.id) return forbidden(res, 'You cannot book your own property');

  const conflicts = await get(
    `SELECT id FROM bookings WHERE property_id = ? AND status IN ('pending','confirmed') AND start_date < ? AND end_date > ?`,
    [propertyId, endDate, startDate]
  );
  if (conflicts) return badRequest(res, 'The selected dates are no longer available');

  const months = monthsBetween(startDate, endDate);
  const monthlyRent = prop.price;
  const totalRent = monthlyRent * months;
  const securityDeposit = monthlyRent;
  const fee = config.bookingFeeNgn;

  const id = newId('bk');
  await run(
    `INSERT INTO bookings (id, property_id, tenant_id, landlord_id, start_date, end_date, monthly_rent, security_deposit, fee, status, payment_status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?)`,
    [id, propertyId, user.id, prop.landlord_id, startDate, endDate, monthlyRent, securityDeposit, fee, notes || '']
  );

  await createNotification(prop.landlord_id, 'booking', 'New booking request', `${user.name} requested to book "${prop.title}".`, `/landlord`);
  await createNotification(user.id, 'booking', 'Booking request sent', `Your request for "${prop.title}" was sent to the landlord.`, '/bookings');

  const booking = await get(`${BOOKING_SELECT} WHERE b.id = ?`, [id]);

  let payment = null;
  if (payNow) {
    payment = await processBookingPayment(booking, user);
  }

  return created(res, {
    message: payNow ? 'Booking created. Payment initiated.' : 'Booking request created.',
    item: rowToBooking(booking),
    payment,
  });
}

async function processBookingPayment(booking, user) {
  const total = booking.fee || 0;
  const amountKobo = total * 100;
  const result = await createBookingPayment({
    userId: booking.tenant_id,
    bookingId: booking.id,
    amount: amountKobo,
    email: user.email,
    metadata: { bookingId: booking.id, description: `Booking fee for ${booking.property_title}` },
  });

  await run(
    `INSERT INTO payments (id, user_id, booking_id, reference, amount, currency, description, type, status, channel, test_mode, created_at)
     VALUES (?, ?, ?, ?, ?, 'NGN', ?, 'booking', ?, ?, ?, ?)`,
    [
      newId('pay'), booking.tenant_id, booking.id, result.reference, total, result.reference,
      result.status, result.channel, result.test_mode ? 1 : 0, now(),
    ]
  );

  if (result.status === 'completed') {
    await run(`UPDATE payments SET paid_at = ?, status = 'succeeded' WHERE reference = ?`, [now(), result.reference]);
    await run(`UPDATE bookings SET payment_status = 'paid', updated_at = ? WHERE id = ?`, [now(), booking.id]);
  }

  return {
    reference: result.reference,
    authorizationUrl: result.authorizationUrl || null,
    status: result.status,
    testMode: result.test_mode,
    simulated: result.test_mode,
    amount: total,
  };
}

async function payBooking(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const booking = await get(`${BOOKING_SELECT} WHERE b.id = ?`, [id]);
  if (!booking) return notFound(res, 'Booking not found');
  if (booking.tenant_id !== user.id) return forbidden(res, 'You can only pay for your own bookings');
  if (booking.payment_status === 'paid') return badRequest(res, 'This booking is already paid');
  if (booking.fee <= 0) {
    // Zero-fee bookings can be "paid" without a gateway round-trip.
    await run(`UPDATE bookings SET payment_status = 'paid', updated_at = ? WHERE id = ?`, [now(), id]);
    const updated = await get(`${BOOKING_SELECT} WHERE b.id = ?`, [id]);
    return ok(res, { message: 'No fee due — payment marked complete.', item: rowToBooking(updated) });
  }

  const payment = await processBookingPayment(booking, user);
  return ok(res, { message: 'Payment initiated', item: rowToBooking(await get(`${BOOKING_SELECT} WHERE b.id = ?`, [id])), payment });
}

async function verifyBookingPayment(req, res, id) {
  const booking = await get(`${BOOKING_SELECT} WHERE b.id = ?`, [id]);
  if (!booking) return notFound(res, 'Booking not found');
  const payment = await get('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
  if (!payment) return notFound(res, 'No payment found for this booking');

  const result = await verifyPaystack(payment.reference);
  if (result.status === 'completed') {
    await run(`UPDATE payments SET status = 'succeeded', paid_at = ?, paystack_ref = ? WHERE id = ?`, [now(), result.paystack_ref || payment.reference, payment.id]);
    await run(`UPDATE bookings SET payment_status = 'paid', updated_at = ? WHERE id = ?`, [now(), id]);
    await createNotification(booking.tenant_id, 'payment', 'Payment confirmed', `Your payment for "${booking.property_title}" was confirmed.`, '/bookings');
  } else {
    await run(`UPDATE payments SET status = ?, paystack_ref = ? WHERE id = ?`, [result.status, result.paystack_ref || payment.reference, payment.id]);
  }
  const updated = await get(`${BOOKING_SELECT} WHERE b.id = ?`, [id]);
  return ok(res, { item: rowToBooking(updated), payment: { reference: payment.reference, status: result.status } });
}

async function updateStatus(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const booking = await get('SELECT * FROM bookings WHERE id = ?', [id]);
  if (!booking) return notFound(res, 'Booking not found');

  // Only landlord who owns the property (or admin) can set confirmed/rejected.
  const canManage = user.role === 'admin' || booking.landlord_id === user.id;
  if (!canManage) return forbidden(res, 'Only the property owner can update this booking');

  const body = parseJson(req) || {};
  const status = String(body.status || '');
  const allowed = ['confirmed', 'rejected', 'completed'];
  if (!allowed.includes(status)) return badRequest(res, 'Status must be confirmed, rejected or completed');

  await run(`UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?`, [status, now(), id]);

  if (status === 'confirmed') {
    await run(`UPDATE properties SET status = 'occupied' WHERE id = ?`, [booking.property_id]);
    await createNotification(booking.tenant_id, 'booking', 'Booking confirmed 🎉', `Your booking was confirmed. Welcome home!`, '/bookings');
  } else if (status === 'rejected') {
    await createNotification(booking.tenant_id, 'booking', 'Booking declined', 'The landlord declined this booking request.', '/bookings');
  }

  const updated = await get(`${BOOKING_SELECT} WHERE b.id = ?`, [id]);
  return ok(res, { message: `Booking ${status}`, item: rowToBooking(updated) });
}

async function cancelBookingRoute(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const booking = await get('SELECT * FROM bookings WHERE id = ?', [id]);
  if (!booking) return notFound(res, 'Booking not found');
  if (booking.tenant_id !== user.id && !(user.role === 'admin')) {
    return forbidden(res, 'You can only cancel your own bookings');
  }
  if (booking.status === 'confirmed') {
    return badRequest(res, 'Confirmed bookings must be cancelled by contacting support');
  }
  await run(`UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?`, [now(), id]);
  await createNotification(booking.landlord_id, 'booking', 'Booking cancelled', 'A tenant cancelled their booking request.', '/landlord');
  const updated = await get(`${BOOKING_SELECT} WHERE b.id = ?`, [id]);
  return ok(res, { message: 'Booking cancelled', item: rowToBooking(updated) });
}

async function updateBooking(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const booking = await get('SELECT * FROM bookings WHERE id = ?', [id]);
  if (!booking) return notFound(res, 'Booking not found');
  if (!(booking.tenant_id === user.id || booking.landlord_id === user.id || user.role === 'admin')) {
    return forbidden(res, 'Forbidden');
  }
  const body = parseJson(req) || {};
  const upd = [];
  const params = [];
  if (body.startDate !== undefined && isDateStr(body.startDate)) { upd.push('start_date = ?'); params.push(body.startDate); }
  if (body.endDate !== undefined && isDateStr(body.endDate)) { upd.push('end_date = ?'); params.push(body.endDate); }
  if (body.notes !== undefined) { upd.push('notes = ?'); params.push(String(body.notes)); }
  if (!upd.length) return badRequest(res, 'No fields to update');
  upd.push('updated_at = ?');
  params.push(now());
  params.push(id);
  await run(`UPDATE bookings SET ${upd.join(', ')} WHERE id = ?`, params);
  const updated = await get(`${BOOKING_SELECT} WHERE b.id = ?`, [id]);
  return ok(res, { message: 'Booking updated', item: rowToBooking(updated) });
}

async function createNotification(userId, type, title, body, link) {
  try {
    await run(
      `INSERT INTO notifications (id, user_id, type, title, body, link, read) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [newId('ntf'), userId, type, title, body, link || null]
    );
  } catch (e) {
    console.error('notification insert failed', e.message);
  }
}
