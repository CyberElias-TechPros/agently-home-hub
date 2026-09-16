// Property routes: list (with filters), detail, create/update/delete (owner+),
// favorites, views, saved searches, similar properties, landlord "my listings".

import { ok, created, badRequest, unauthorized, forbidden, notFound, serverError, parseJson, authTokenFromRequest, currentUser, parsePagination, paginated, isAdmin } from '../lib/http.js';
import { all, get, run, withTx, now, newId } from '../db/db.js';

const TYPES = ['apartment', 'house', 'condo', 'townhouse', 'studio', 'room'];
const STATUSES = ['available', 'occupied', 'maintenance', 'unavailable', 'pending'];

const PROPERTY_SELECT = `
  SELECT p.*, u.name AS landlord_name, u.email AS landlord_email, u.phone AS landlord_phone,
         (SELECT COUNT(*) FROM property_views v WHERE v.property_id = p.id) AS view_count,
         (SELECT COUNT(*) FROM favorites f WHERE f.property_id = p.id) AS favorite_count
  FROM properties p
  JOIN users u ON u.id = p.landlord_id
`;

export function rowToProperty(row) {
  if (!row) return null;
  const parse = (v, fb) => {
    if (v == null || v === '') return fb;
    if (typeof v === 'object') return v;
    try { return JSON.parse(v); } catch { return fb; }
  };
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    price: row.price,
    pricePeriod: row.price_period,
    status: row.status,
    landlordId: row.landlord_id,
    landlordName: row.landlord_name,
    landlordEmail: row.landlord_email,
    landlordPhone: row.landlord_phone,
    location: {
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      coordinates: row.latitude != null ? { lat: row.latitude, lng: row.longitude } : null,
    },
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    area: row.area_sqm,
    areaSqm: row.area_sqm,
    yearBuilt: row.year_built,
    amenities: parse(row.amenities, []),
    images: parse(row.images, []),
    featured: !!row.featured,
    published: !!row.published,
    availableFrom: row.available_from,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stats: {
      views: row.view_count ?? 0,
      favorites: row.favorite_count ?? 0,
    },
  };
}

export async function handleProperties(req, res, parts) {
  if (req.method === 'GET' && parts.length === 0) return listProperties(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'my') return myProperties(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'favorites') return getFavorites(req, res);
  if (req.method === 'GET' && parts.length === 2 && parts[0] === 'similar') return similarProperties(req, res, parts[1]);
  if (req.method === 'POST' && parts.length === 0) return createProperty(req, res);
  if (req.method === 'POST' && parts.length === 2 && parts[1] === 'favorite') return toggleFavorite(req, res, parts[0], true);
  if (req.method === 'DELETE' && parts.length === 2 && parts[1] === 'favorite') return toggleFavorite(req, res, parts[0], false);
  if (req.method === 'POST' && parts.length === 2 && parts[1] === 'view') return recordView(req, res, parts[0]);

  if (parts.length === 1) {
    if (req.method === 'GET') return getProperty(req, res, parts[0]);
    if (req.method === 'PUT') return updateProperty(req, res, parts[0]);
    if (req.method === 'DELETE') return deleteProperty(req, res, parts[0]);
  }
  return notFound(res, 'Property route not found');
}

export function buildPropertyFilters(queryObj) {
  const q = queryObj || {};
  const filters = {};
  let where = ['p.published = 1'];
  const params = [];

  if (q.search) {
    const s = `%${String(q.search).trim()}%`;
    where.push('(p.title LIKE ? OR p.description LIKE ? OR p.city LIKE ? OR p.state LIKE ? OR p.address LIKE ?)');
    params.push(s, s, s, s, s);
    filters.search = q.search;
  }
  if (q.type && TYPES.includes(String(q.type))) {
    where.push('p.type = ?');
    params.push(String(q.type));
    filters.type = q.type;
  }
  if (q.city) {
    where.push('p.city = ?');
    params.push(String(q.city));
    filters.city = q.city;
  }
  if (q.state) {
    where.push('p.state = ?');
    params.push(String(q.state));
    filters.state = q.state;
  }
  if (q.status && STATUSES.includes(String(q.status))) {
    where.push('p.status = ?');
    params.push(String(q.status));
    filters.status = q.status;
  }
  const minPrice = parseInt(q.minPrice, 10);
  const maxPrice = parseInt(q.maxPrice, 10);
  if (Number.isFinite(minPrice)) {
    where.push('p.price >= ?');
    params.push(minPrice);
    filters.minPrice = minPrice;
  }
  if (Number.isFinite(maxPrice)) {
    where.push('p.price <= ?');
    params.push(maxPrice);
    filters.maxPrice = maxPrice;
  }
  const minBeds = parseInt(q.bedrooms ?? q.minBedrooms, 10);
  if (Number.isFinite(minBeds)) {
    where.push('p.bedrooms >= ?');
    params.push(minBeds);
  }
  const minBaths = parseInt(q.bathrooms ?? q.minBathrooms, 10);
  if (Number.isFinite(minBaths)) {
    where.push('p.bathrooms >= ?');
    params.push(minBaths);
  }
  if (q.featured === 'true' || q.featured === '1') {
    where.push('p.featured = 1');
  }

  return { where, params, filters };
}

async function listProperties(req, res) {
  const { where, params, filters } = buildPropertyFilters(req.query || {});
  const { page, limit, offset } = parsePagination(req.query || {});

  const sortKey = String(req.query.sortBy || 'newest').toString();
  const orderMap = {
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC',
    newest: 'p.created_at DESC',
    oldest: 'p.created_at ASC',
    bedrooms: 'p.bedrooms DESC',
    popular: 'view_count DESC',
  };
  const orderBy = orderMap[sortKey] || orderMap.newest;

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = await get(`SELECT COUNT(*) AS c FROM properties p ${whereSql}`, params);
  const total = totalRow ? totalRow.c : 0;

  const rows = await all(
    `${PROPERTY_SELECT} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return paginated(res, rows.map(rowToProperty), total, page, limit);
}

async function similarProperties(req, res, id) {
  const prop = await get('SELECT * FROM properties WHERE id = ?', [id]);
  if (!prop) return notFound(res, 'Property not found');
  const rows = await all(
    `SELECT p.*, u.name AS landlord_name, u.email AS landlord_email, u.phone AS landlord_phone
     FROM properties p JOIN users u ON u.id = p.landlord_id
     WHERE p.id != ? AND p.city = ? AND p.published = 1
     ORDER BY ABS(p.price - ?) ASC LIMIT 4`,
    [id, prop.city, prop.price]
  );
  return ok(res, { items: rows.map(rowToProperty) });
}

async function myProperties(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const { page, limit, offset } = parsePagination(req.query || {});
  const where = ['p.landlord_id = ?'];
  const params = [user.id];
  if (req.query.status) {
    where.push('p.status = ?');
    params.push(String(req.query.status));
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const totalRow = await get(`SELECT COUNT(*) AS c FROM properties p ${whereSql}`, params);
  const total = totalRow ? totalRow.c : 0;
  const rows = await all(`${PROPERTY_SELECT} ${whereSql} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  return paginated(res, rows.map(rowToProperty), total, page, limit);
}

async function getProperty(req, res, id) {
  const row = await get(`${PROPERTY_SELECT} WHERE p.id = ?`, [id]);
  if (!row) return notFound(res, 'Property not found');
  return ok(res, { item: rowToProperty(row) });
}

function parseList(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return [v]; }
  }
  return [];
}

async function createProperty(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  if (!['landlord', 'manager', 'admin'].includes(user.role)) {
    return forbidden(res, 'Only landlords and managers can list properties');
  }
  const body = parseJson(req);
  if (!body) return badRequest(res, 'Invalid JSON body');

  const required = ['title', 'type', 'price', 'address', 'city', 'state'];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === '') {
      return badRequest(res, `Missing required field: ${k}`);
    }
  }
  if (!TYPES.includes(String(body.type))) return badRequest(res, 'Invalid property type');
  const price = parseInt(body.price, 10);
  if (!Number.isFinite(price) || price <= 0) return badRequest(res, 'Price must be a positive number (₦)');

  const id = newId('prp');
  await run(
    `INSERT INTO properties (
      id, landlord_id, title, description, type, price, price_period, status,
      address, city, state, country, latitude, longitude, bedrooms, bathrooms,
      area_sqm, year_built, amenities, images, featured, published, available_from
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, user.id,
      String(body.title).trim(), String(body.description || '').trim() || 'No description provided.',
      String(body.type), price, body.pricePeriod || 'month', body.status || 'available',
      String(body.address).trim(), String(body.city).trim(), String(body.state).trim(),
      body.country || 'NG',
      body.lat != null ? Number(body.lat) : null, body.lng != null ? Number(body.lng) : null,
      parseInt(body.bedrooms || 0, 10) || 0, parseFloat(body.bathrooms || 0) || 0,
      parseInt(body.areaSqm || body.area || 0, 10) || 0,
      body.yearBuilt ? parseInt(body.yearBuilt, 10) : null,
      JSON.stringify(parseList(body.amenities)), JSON.stringify(parseList(body.images)),
      body.featured ? 1 : 0, body.published === false ? 0 : 1, body.availableFrom || null,
    ]
  );
  const row = await get(`${PROPERTY_SELECT} WHERE p.id = ?`, [id]);
  return created(res, { message: 'Property listed successfully', item: rowToProperty(row) });
}

async function canManageProperty(user, property) {
  if (!property) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'manager') return true;
  return property.landlord_id === user.id;
}

async function updateProperty(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const prop = await get('SELECT * FROM properties WHERE id = ?', [id]);
  if (!prop) return notFound(res, 'Property not found');
  if (!(await canManageProperty(user, prop))) return forbidden(res, 'You can only update your own listings');

  const body = parseJson(req);
  if (!body) return badRequest(res, 'Invalid JSON body');
  const upd = [];
  const params = [];
  const strFields = ['title', 'description', 'type', 'status', 'address', 'city', 'state', 'country', 'availableFrom'];
  for (const key of strFields) {
    if (body[key] !== undefined) {
      const map = { availableFrom: 'available_from' };
      upd.push(`${map[key] || key} = ?`);
      params.push(String(body[key] ?? '').trim());
    }
  }
  if (body.price !== undefined) {
    const price = parseInt(body.price, 10);
    if (!Number.isFinite(price) || price <= 0) return badRequest(res, 'Price must be a positive number (₦)');
    upd.push('price = ?');
    params.push(price);
  }
  if (body.type !== undefined && !TYPES.includes(String(body.type))) return badRequest(res, 'Invalid property type');
  const numFields = [['bedrooms', 'bedrooms', 0], ['bathrooms', 'bathrooms', 0], ['areaSqm', 'area_sqm', 0], ['yearBuilt', 'year_built', null]];
  for (const [k, col, fb] of numFields) {
    if (body[k] !== undefined) {
      upd.push(`${col} = ?`);
      const n = parseInt(body[k], 10);
      params.push(Number.isFinite(n) ? n : fb);
    }
  }
  if (body.amenities !== undefined) { upd.push('amenities = ?'); params.push(JSON.stringify(parseList(body.amenities))); }
  if (body.images !== undefined) { upd.push('images = ?'); params.push(JSON.stringify(parseList(body.images))); }
  if (body.featured !== undefined) { upd.push('featured = ?'); params.push(body.featured ? 1 : 0); }
  if (body.published !== undefined) { upd.push('published = ?'); params.push(body.published ? 1 : 0); }
  if (body.latitude !== undefined) { upd.push('latitude = ?'); params.push(Number(body.latitude)); }
  if (body.longitude !== undefined) { upd.push('longitude = ?'); params.push(Number(body.longitude)); }

  if (!upd.length) return badRequest(res, 'No fields to update');
  upd.push('updated_at = ?');
  params.push(now());
  params.push(id);
  await run(`UPDATE properties SET ${upd.join(', ')} WHERE id = ?`, params);

  const row = await get(`${PROPERTY_SELECT} WHERE p.id = ?`, [id]);
  return ok(res, { message: 'Property updated', item: rowToProperty(row) });
}

async function deleteProperty(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const prop = await get('SELECT * FROM properties WHERE id = ?', [id]);
  if (!prop) return notFound(res, 'Property not found');
  if (!(await canManageProperty(user, prop))) return forbidden(res, 'You can only delete your own listings');

  const active = await get(
    `SELECT COUNT(*) AS c FROM bookings WHERE property_id = ? AND status IN ('pending','confirmed')`,
    [id]
  );
  if (active && active.c > 0) {
    return badRequest(res, 'Cannot delete a property with active bookings');
  }
  await run('DELETE FROM properties WHERE id = ?', [id]);
  return ok(res, { message: 'Property deleted' });
}

async function toggleFavorite(req, res, id, add) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const prop = await get('SELECT id FROM properties WHERE id = ?', [id]);
  if (!prop) return notFound(res, 'Property not found');
  if (add) {
    await run('INSERT OR IGNORE INTO favorites (user_id, property_id) VALUES (?, ?)', [user.id, id]);
  } else {
    await run('DELETE FROM favorites WHERE user_id = ? AND property_id = ?', [user.id, id]);
  }
  const favCount = await get('SELECT COUNT(*) AS c FROM favorites WHERE user_id = ?', [user.id]);
  const list = await all('SELECT property_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  return ok(res, {
    favorited: add,
    count: favCount.c,
    propertyIds: list.map((r) => r.property_id),
  });
}

export async function getFavorites(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all(
    `SELECT p.*, u.name AS landlord_name, u.email AS landlord_email, u.phone AS landlord_phone
     FROM favorites f
     JOIN properties p ON p.id = f.property_id
     JOIN users u ON u.id = p.landlord_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [user.id]
  );
  return ok(res, { items: rows.map(rowToProperty) });
}

async function recordView(req, res, id) {
  const prop = await get('SELECT id FROM properties WHERE id = ?', [id]);
  if (!prop) return notFound(res, 'Property not found');
  const user = await currentUser(req);
  await run('INSERT INTO property_views (id, property_id, user_id) VALUES (?, ?, ?)', [newId('vw'), id, user ? user.id : null]);
  const c = await get('SELECT COUNT(*) AS c FROM property_views WHERE property_id = ?', [id]);
  return ok(res, { views: c.c });
}
