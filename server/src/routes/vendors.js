// Vendor marketplace: list vendors, services, reviews, book a service, cancel.

import { ok, created, badRequest, unauthorized, forbidden, notFound, parseJson, currentUser, parsePagination, paginated } from '../lib/http.js';
import { all, get, run, newId, now } from '../db/db.js';

function safeJson(v, fb) {
  if (v == null || v === '') return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

export async function handleVendors(req, res, parts) {
  if (req.method === 'GET' && parts.length === 0) return listVendors(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'services') return listServices(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'bookings') return listServiceBookings(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'bookings') return bookService(req, res);
  if (req.method === 'PUT' && parts.length === 3 && parts[0] === 'bookings' && parts[2] === 'cancel') return cancelServiceBooking(req, res, parts[1]);
  if (req.method === 'GET' && parts.length === 2 && parts[0] === 'reviews') return listReviews(req, res, parts[1]);
  if (req.method === 'POST' && parts.length === 2 && parts[0] === 'reviews') return addReview(req, res, parts[1]);
  if (parts.length === 1) {
    const vendor = await get('SELECT * FROM vendors WHERE id = ?', [parts[0]]);
    if (!vendor) return notFound(res, 'Vendor not found');
    return ok(res, { item: vendorView(vendor), services: (await all('SELECT * FROM vendor_services WHERE vendor_id = ?', [vendor.id])).map(serviceView) });
  }
  return notFound(res, 'Vendor route not found');
}

function vendorView(v) {
  return {
    id: v.id,
    name: v.name,
    email: v.email,
    phone: v.phone,
    businessName: v.business_name,
    description: v.description,
    services: safeJson(v.services, []),
    category: v.category,
    location: { city: v.city, state: v.state },
    rating: v.rating,
    reviewCount: v.review_count,
    verified: !!v.verified,
    licenseNumber: v.license_number,
  };
}

function serviceView(s) {
  return {
    id: s.id,
    vendorId: s.vendor_id,
    name: s.name,
    description: s.description,
    category: s.category,
    price: s.price,
    durationMinutes: s.duration_min,
  };
}

async function listVendors(req, res) {
  const { page, limit, offset } = parsePagination(req.query || {});
  const where = [];
  const params = [];
  if (req.query.search) {
    where.push('(v.name LIKE ? OR v.business_name LIKE ? OR v.description LIKE ? OR v.category LIKE ?)');
    const s = `%${String(req.query.search).trim()}%`;
    params.push(s, s, s, s);
  }
  if (req.query.category && req.query.category !== 'all') {
    where.push('v.category = ?');
    params.push(String(req.query.category));
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = await get(`SELECT COUNT(*) AS c FROM vendors v ${whereSql}`, params);
  const rows = await all(`SELECT * FROM vendors v ${whereSql} ORDER BY v.rating DESC, v.review_count DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  return paginated(res, rows.map(vendorView), totalRow.c, page, limit);
}

async function listServices(req, res) {
  const rows = await all('SELECT * FROM vendor_services ORDER BY price ASC');
  return ok(res, { items: rows.map(serviceView) });
}

async function listServiceBookings(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all(
    `SELECT sb.*, v.name AS vendor_name, vs.name AS service_name
     FROM service_bookings sb
     JOIN vendors v ON v.id = sb.vendor_id
     LEFT JOIN vendor_services vs ON vs.id = sb.service_id
     WHERE sb.client_id = ?
     ORDER BY sb.created_at DESC`,
    [user.id]
  );
  return ok(res, {
    items: rows.map((r) => ({
      id: r.id,
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      serviceId: r.service_id,
      serviceName: r.service_name,
      date: r.date,
      time: r.time,
      status: r.status,
      notes: r.notes,
      totalPrice: r.total_price,
      address: r.address,
      createdAt: r.created_at,
    })),
  });
}

async function bookService(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { vendorId, serviceId, date, time, notes, address } = body;
  if (!vendorId || !date || !time) return badRequest(res, 'vendorId, date and time are required');

  const vendor = await get('SELECT id FROM vendors WHERE id = ?', [vendorId]);
  if (!vendor) return notFound(res, 'Vendor not found');
  const service = await get('SELECT * FROM vendor_services WHERE id = ?', [serviceId]);
  const price = service ? service.price : 0;

  const id = newId('svb');
  await run(
    `INSERT INTO service_bookings (id, vendor_id, service_id, client_id, date, time, status, notes, total_price, address)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [id, vendorId, serviceId || null, user.id, date, time, notes || '', price, address || null]
  );
  return created(res, {
    message: 'Service booking requested',
    item: { id, vendorId, serviceId, date, time, status: 'pending', notes, totalPrice: price, address },
  });
}

async function cancelServiceBooking(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const booking = await get('SELECT * FROM service_bookings WHERE id = ?', [id]);
  if (!booking) return notFound(res, 'Service booking not found');
  if (booking.client_id !== user.id && user.role !== 'admin') return forbidden(res);
  await run(`UPDATE service_bookings SET status = 'cancelled' WHERE id = ?`, [id]);
  return ok(res, { message: 'Service booking cancelled', success: true });
}

async function listReviews(req, res, vendorId) {
  const rows = await all(
    `SELECT r.*, u.name AS author_name FROM reviews r JOIN users u ON u.id = r.author_id
     WHERE r.entity_type = 'vendor' AND r.entity_id = ?
     ORDER BY r.created_at DESC`,
    [vendorId]
  );
  return ok(res, {
    items: rows.map((r) => ({
      id: r.id, rating: r.rating, comment: r.comment, authorName: r.author_name, createdAt: r.created_at,
    })),
  });
}

async function addReview(req, res, vendorId) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const rating = parseInt(body.rating, 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return badRequest(res, 'Rating must be 1–5');
  const id = newId('rvw');
  await run(
    `INSERT INTO reviews (id, entity_type, entity_id, author_id, rating, comment) VALUES (?, 'vendor', ?, ?, ?, ?)`,
    [id, vendorId, user.id, rating, String(body.comment || '').trim()]
  );
  const agg = await get('SELECT AVG(rating) AS avg, COUNT(*) AS c FROM reviews WHERE entity_type = ? AND entity_id = ?', ['vendor', vendorId]);
  await run('UPDATE vendors SET rating = ?, review_count = ? WHERE id = ?', [Math.round(agg.avg * 10) / 10, agg.c, vendorId]);
  return created(res, { message: 'Review submitted', item: { id, rating, comment: String(body.comment || '').trim() } });
}
