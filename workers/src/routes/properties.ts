/**
 * Properties: list/search, get, create, update, delete, favorites,
 * saved searches, contact + booking intents.
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { ApiError } from '../errors';
import { uuid, nowIso, id } from '../crypto';
import { requireAuth, requireRole, currentUserId } from '../middleware';
import { Property } from '../models/property';

type Ctx = { Bindings: Env; Variables: Variables };

export const properties = new Hono<Ctx>();

const VALID_TYPES = ['apartment', 'house', 'condo', 'studio', 'townhouse'];
const VALID_STATUS = ['available', 'occupied', 'maintenance', 'off_market'];

// ---------------------------------------------------------------------------
// GET /api/properties — full-text-ish search + filters + sorting + pagination
// ---------------------------------------------------------------------------
properties.get('/', async (c) => {
  const q = c.req.query('q');
  const conditions: string[] = ['1 = 1'];
  const params: unknown[] = [];

  if (q) {
    conditions.push('(title LIKE ? OR description LIKE ? OR city LIKE ? OR state LIKE ? OR address LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }

  const type = c.req.query('type');
  if (type && type !== 'all') {
    if (!VALID_TYPES.includes(type)) throw ApiError.badRequest('Invalid property type');
    conditions.push('type = ?');
    params.push(type);
  }

  const city = c.req.query('city');
  if (city) {
    conditions.push('city = ?');
    params.push(city);
  }

  const status = c.req.query('status');
  if (status) {
    if (!VALID_STATUS.includes(status)) throw ApiError.badRequest('Invalid status');
    conditions.push('status = ?');
    params.push(status);
  } else {
    conditions.push("status = 'available'");
  }

  const minPrice = c.req.query('minPrice');
  if (minPrice !== undefined && minPrice !== '') {
    conditions.push('price >= ?');
    params.push(Number(minPrice));
  }

  const maxPrice = c.req.query('maxPrice');
  if (maxPrice !== undefined && maxPrice !== '') {
    conditions.push('price <= ?');
    params.push(Number(maxPrice));
  }

  const bedrooms = c.req.query('bedrooms');
  if (bedrooms !== undefined && bedrooms !== '') {
    conditions.push('bedrooms >= ?');
    params.push(Number(bedrooms));
  }

  const bathrooms = c.req.query('bathrooms');
  if (bathrooms !== undefined && bathrooms !== '') {
    conditions.push('bathrooms >= ?');
    params.push(Number(bathrooms));
  }

  const amenities = c.req.query('amenities');
  if (amenities) {
    for (const a of amenities.split(',').map((s) => s.trim()).filter(Boolean)) {
      conditions.push('amenities LIKE ?');
      params.push(`%"${a}"%`);
    }
  }

  const featured = c.req.query('featured');
  if (featured === 'true' || featured === '1') conditions.push('featured = 1');

  // ordering
  const sort = c.req.query('sort') ?? 'created_at';
  const order = (c.req.query('order') ?? 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const sortMap: Record<string, string> = {
    price: 'price',
    newest: 'created_at',
    oldest: 'created_at',
    bedrooms: 'bedrooms',
    area: 'area',
  };
  const sortCol = sortMap[sort] ?? 'created_at';
  const ascending = (sort === 'oldest' || order === 'ASC') && sort !== 'newest';

  // pagination
  const page = Math.max(1, Number(c.req.query('page') ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? 12) || 12));
  const offset = (page - 1) * limit;

  const where = conditions.join(' AND ');
  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) AS total FROM properties WHERE ${where}`)
    .bind(...params).first();
  const total = (countRow?.total as number) ?? 0;

  const rows = await c.env.DB.prepare(
    `SELECT * FROM properties WHERE ${where} ORDER BY ${sortCol} ${ascending ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`,
  ).bind(...params, limit, offset).all();

  return c.json({
    success: true,
    data: rows.results.map((r) => Property.toPublic(r)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ---------------------------------------------------------------------------
// GET /api/properties/featured
// ---------------------------------------------------------------------------
properties.get('/featured', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT * FROM properties WHERE status = 'available' ORDER BY featured DESC, created_at DESC LIMIT 9`,
  ).all();
  return c.json({ success: true, data: rows.results.map((r) => Property.toPublic(r)) });
});

// ---------------------------------------------------------------------------
// GET /api/properties/:id
// ---------------------------------------------------------------------------
properties.get('/:id', async (c) => {
  const id_ = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id_).first();
  if (!row) throw ApiError.notFound('Property not found');

  const landlord = await c.env.DB.prepare(
    'SELECT id, name, email, role, verified, trust_score FROM users WHERE id = ?',
  ).bind(row.landlord_id).first();

  return c.json({
    success: true,
    data: { ...Property.toPublic(row), landlord: landlord ?? null },
  });
});

// ---------------------------------------------------------------------------
// POST /api/properties (landlord / agent / manager / admin)
// ---------------------------------------------------------------------------
properties.post('/', requireAuth, requireRole('landlord', 'agent', 'manager'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 4) throw ApiError.badRequest('Title is required (min 4 characters)');
  const type = VALID_TYPES.includes(body.type) ? body.type : 'apartment';
  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) throw ApiError.badRequest('A valid price is required');

  const propertyId = uuid();
  const description = typeof body.description === 'string' ? body.description : '';
  const city = typeof body.location?.city === 'string' ? body.location.city : (typeof body.city === 'string' ? body.city : '');
  const state = typeof body.location?.state === 'string' ? body.location.state : (typeof body.state === 'string' ? body.state : '');
  const address = typeof body.location?.address === 'string' ? body.location.address : (typeof body.address === 'string' ? body.address : '');
  const zipCode = body.location?.zipCode ?? body.zipCode ?? null;
  const lat = body.location?.coordinates?.lat ?? null;
  const lng = body.location?.coordinates?.lng ?? null;
  const images = Array.isArray(body.images) ? JSON.stringify(body.images) : '[]';
  const amenities = Array.isArray(body.amenities) ? JSON.stringify(body.amenities) : '[]';
  const bedrooms = Number(body.bedrooms ?? 0);
  const bathrooms = Number(body.bathrooms ?? 0);
  const area = Number(body.area ?? 0);
  const availableFrom = body.availableFrom ?? null;
  const featured = body.featured ? 1 : 0;

  await c.env.DB.prepare(
    `INSERT INTO properties
      (id, landlord_id, title, description, type, price, address, city, state, zip_code, lat, lng,
       images, bedrooms, bathrooms, area, amenities, status, available_from, featured, verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, 0)`,
  ).bind(propertyId, currentUserId(c), title, description, type, price, address, city, state, zipCode, lat, lng,
    images, bedrooms, bathrooms, area, amenities, availableFrom, featured).run();

  const row = await c.env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(propertyId).first();
  return c.json({ success: true, data: Property.toPublic(row) }, 201);
});

// ---------------------------------------------------------------------------
// PUT /api/properties/:id (owner or role)
// ---------------------------------------------------------------------------
properties.put('/:id', requireAuth, async (c) => {
  const id_ = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id_).first();
  if (!row) throw ApiError.notFound('Property not found');

  const user = c.get('user')!;
  if (row.landlord_id !== user.sub && !['admin', 'manager'].includes(user.role)) {
    throw ApiError.forbidden('You can only edit your own listings');
  }

  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const params: unknown[] = [];

  const scalarMap: Record<string, string> = {
    title: 'title', description: 'description', type: 'type', price: 'price',
    address: 'address', city: 'city', state: 'state', zip_code: 'zipCode',
    lat: 'lat', lng: 'lng', bedrooms: 'bedrooms', bathrooms: 'bathrooms',
    area: 'area', year_built: 'yearBuilt', available_from: 'availableFrom',
    status: 'status', rules: 'rules', currency: 'currency',
  };
  for (const [col, key] of Object.entries(scalarMap)) {
    if (body[key] !== undefined && body[key] !== null) {
      sets.push(`${col} = ?`);
      params.push(body[key]);
    }
  }
  if (Array.isArray(body.images)) {
    sets.push('images = ?');
    params.push(JSON.stringify(body.images));
  }
  if (Array.isArray(body.amenities)) {
    sets.push('amenities = ?');
    params.push(JSON.stringify(body.amenities));
  }
  if (body.featured !== undefined) {
    sets.push('featured = ?');
    params.push(body.featured ? 1 : 0);
  }

  if (sets.length === 0) throw ApiError.badRequest('No valid fields to update');

  sets.push('updated_at = ?');
  params.push(nowIso(), id_);
  await c.env.DB.prepare(`UPDATE properties SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();

  const updated = await c.env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id_).first();
  return c.json({ success: true, data: Property.toPublic(updated) });
});

// ---------------------------------------------------------------------------
// DELETE /api/properties/:id
// ---------------------------------------------------------------------------
properties.delete('/:id', requireAuth, async (c) => {
  const id_ = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id_).first();
  if (!row) throw ApiError.notFound('Property not found');

  const user = c.get('user')!;
  if (row.landlord_id !== user.sub && !['admin', 'manager'].includes(user.role)) {
    throw ApiError.forbidden('You can only delete your own listings');
  }

  await c.env.DB.prepare('DELETE FROM properties WHERE id = ?').bind(id_).run();
  return c.json({ success: true, data: { deleted: true } });
});

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------
properties.get('/favorites/mine', requireAuth, async (c) => {
  const userId = currentUserId(c);
  const rows = await c.env.DB.prepare(
    `SELECT p.* FROM properties p JOIN favorites f ON f.property_id = p.id WHERE f.user_id = ? ORDER BY f.created_at DESC`,
  ).bind(userId).all();
  return c.json({ success: true, data: rows.results.map((r) => Property.toPublic(r)) });
});

properties.put('/:id/favorite', requireAuth, async (c) => {
  const id_ = c.req.param('id');
  const userId = currentUserId(c);
  const body = await c.req.json().catch(() => ({}));
  const fav = body.favorite !== false;

  const prop = await c.env.DB.prepare('SELECT id FROM properties WHERE id = ?').bind(id_).first();
  if (!prop) throw ApiError.notFound('Property not found');

  if (fav) {
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO favorites (user_id, property_id) VALUES (?, ?)',
    ).bind(userId, id_).run();
  } else {
    await c.env.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND property_id = ?')
      .bind(userId, id_).run();
  }

  return c.json({ success: true, data: { propertyId: id_, favorited: fav } });
});

// ---------------------------------------------------------------------------
// Saved searches
// ---------------------------------------------------------------------------
properties.get('/searches/mine', requireAuth, async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(currentUserId(c)).all();
  return c.json({
    success: true,
    data: rows.results.map((r) => ({ ...r, filters: JSON.parse(r.filters as string) })),
  });
});

properties.post('/searches', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Saved search';
  const filters = typeof body.filters === 'object' && body.filters ? body.filters : {};
  const searchId = id('ss');
  await c.env.DB.prepare(
    'INSERT INTO saved_searches (id, user_id, name, filters) VALUES (?, ?, ?, ?)',
  ).bind(searchId, currentUserId(c), name, JSON.stringify(filters)).run();
  return c.json({ success: true, data: { id: searchId, name, filters } }, 201);
});

properties.delete('/searches/:id', requireAuth, async (c) => {
  await c.env.DB.prepare('DELETE FROM saved_searches WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), currentUserId(c)).run();
  return c.json({ success: true, data: { deleted: true } });
});
