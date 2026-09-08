import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth, requireParam } from '../http/context';
import { created, ok, noContent } from '../http/responses';
import { validate, validateQuery, paginationSchema, idSchema, parseJsonBody } from '../http/validate';
import { withRateLimit } from '../http/middleware';
import { ApiError } from '../lib/errors';
import { execute, nowIso, queryOne } from '../repositories/db';
import { properties } from '../repositories/properties';
import { users } from '../repositories/users';
import {
  AMENITIES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  formatAddress,
  slugify,
  toPropertyDto,
  type PropertyStatus,
  type PropertyType,
} from '../domain/property';
import { canListProperties } from '../domain/roles';
import { recordAudit } from '../services/notifications';

/**
 * Upper bound for a yearly rent, in naira.
 *
 * ₦1bn/yr is deliberately generous: prime Lagos (Ikoyi, Banana Island) and
 * Abuja (Maitama, Asokoro) lets comfortably exceed ₦50m/yr, and a cap that
 * rejects real stock is worse than a cap that is rarely hit. The stored value
 * is an INTEGER number of kobo, so this still fits comfortably in 64 bits.
 */
const MAX_YEARLY_RENT = 1_000_000_000;

const propertyInputSchema = z.object({
  title: z.string().trim().min(6, 'Give the listing a descriptive title.').max(160),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(PROPERTY_TYPES as [PropertyType, ...PropertyType[]]),
  status: z.enum(PROPERTY_STATUSES as [PropertyStatus, ...PropertyStatus[]]).default('available'),
  price: z.number().positive('Enter a yearly rent greater than zero.').max(MAX_YEARLY_RENT),
  currency: z.string().length(3).default('NGN'),
  deposit: z.number().min(0).max(MAX_YEARLY_RENT).optional(),
  minimum_lease_months: z.number().int().min(0).max(600).optional(),
  address_line1: z.string().trim().min(3).max(255),
  address_line2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  zip_code: z.string().trim().min(2).max(20),
  country: z.string().trim().min(2).max(60).default('Nigeria'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  bedrooms: z.number().int().min(0).max(50).default(0),
  bathrooms: z.number().min(0).max(50).default(0),
  area_sqft: z.number().int().min(0).max(1_000_000).optional(),
  year_built: z.number().int().min(1800).max(2100).optional(),
  amenities: z.array(z.enum(AMENITIES)).max(30).default([]),
  images: z.array(z.string().url('Images must be valid URLs.')).max(20).default([]),
  featured: z.boolean().optional(),
  available_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

interface SearchPayload {
  data: ReturnType<typeof toPropertyDto>[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
}

const searchSchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  status: z.enum(PROPERTY_STATUSES as [PropertyStatus, ...PropertyStatus[]]).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  amenities: z.union([z.string(), z.array(z.string())]).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest']).default('relevance'),
});

export const propertyRoutes = new Hono<AppEnv>();

/**
 * Public listing search.
 *
 * Results for anonymous traffic are cached in KV for 60s. Property browsing is
 * by far the highest-volume read on the platform and the data is not
 * interactive, so brief staleness is a good trade.
 */
propertyRoutes.get('/', withRateLimit('search:default'), async (c: AppContext) => {
  const query = validateQuery(searchSchema, new URL(c.req.url).searchParams);
  const isAnonymous = !c.req.header('Authorization');

  const types = normaliseList(query.type)?.filter((value): value is PropertyType =>
    (PROPERTY_TYPES as string[]).includes(value)
  );
  const amenities = normaliseList(query.amenities);

  if (query.min_price !== undefined && query.max_price !== undefined && query.min_price > query.max_price) {
    throw ApiError.validation('The minimum price cannot be greater than the maximum price.', {
      min_price: ['Must be less than or equal to the maximum price.'],
    });
  }

  // Cache keys carry a generation counter that every write bumps. Without it a
  // published or edited listing would keep serving stale search results for the
  // full TTL, because there is no way to enumerate KV keys and evict them.
  const generation = isAnonymous ? Number((await c.env.CACHE.get('properties:generation')) ?? '0') : 0;
  const cacheKey = `properties:list:g${generation}:${JSON.stringify({ ...query, types, amenities })}`;
  if (isAnonymous) {
    const cached = await c.env.CACHE.get<SearchPayload>(cacheKey, 'json');
    if (cached) return ok(cached, 200, { 'X-Cache': 'HIT' });
  }

  const { rows, total } = await properties.search(c.env.DB, {
    q: query.q,
    city: query.city,
    state: query.state,
    types,
    status: query.status,
    minPrice: query.min_price === undefined ? undefined : Math.round(query.min_price * 100),
    maxPrice: query.max_price === undefined ? undefined : Math.round(query.max_price * 100),
    bedrooms: query.bedrooms,
    bathrooms: query.bathrooms,
    amenities,
    sort: query.sort,
    page: query.page,
    perPage: query.per_page,
  });

  const payload: SearchPayload = {
    data: rows.map(toPropertyDto),
    pagination: {
      page: query.page,
      per_page: query.per_page,
      total,
      total_pages: Math.max(1, Math.ceil(total / query.per_page)),
    },
  };

  if (isAnonymous) {
    await c.env.CACHE.put(cacheKey, JSON.stringify(payload), { expirationTtl: 60 });
  }

  return ok(payload, 200, isAnonymous ? { 'X-Cache': 'MISS' } : undefined);
});

propertyRoutes.get('/featured', async (c: AppContext) => {
  const limit = Number(new URL(c.req.url).searchParams.get('limit') ?? 6);
  const rows = await properties.featured(c.env.DB, Math.min(Math.max(limit, 1), 24));
  return ok({ data: rows.map(toPropertyDto) });
});

/** Landlord's own listings, including drafts. */
propertyRoutes.get('/mine', async (c: AppContext) => {
  const auth = currentAuth(c);
  const rows = await properties.listByLandlord(c.env.DB, auth.userId);
  return ok({ data: rows.map(toPropertyDto) });
});

propertyRoutes.get('/:idOrSlug', async (c: AppContext) => {
  const idOrSlug = requireParam(c, 'idOrSlug');
  const row = idSchema.safeParse(idOrSlug).success
    ? await properties.byId(c.env.DB, idOrSlug)
    : await properties.bySlug(c.env.DB, idOrSlug);

  if (!row) throw ApiError.notFound('That listing');

  const dto = toPropertyDto(row);
  return ok({
    data: {
      ...dto,
      address: formatAddress(dto),
      landlord: row.landlord_name ? { id: row.landlord_id, name: row.landlord_name } : null,
    },
  });
});

propertyRoutes.post('/', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  if (!canListProperties(auth.role)) {
    throw ApiError.forbidden('Only landlords and agents can publish listings.');
  }

  const body = validate(propertyInputSchema, await parseJsonBody(c.req.raw));
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(c, body.title);

  await execute(
    c.env.DB,
    `INSERT INTO properties (
        id, slug, title, description, type, status, landlord_id,
        price_amount, currency, deposit_amount, minimum_lease_months,
        address_line1, address_line2, city, state, zip_code, country,
        latitude, longitude, bedrooms, bathrooms, area_sqft, year_built,
        amenities, images, featured, available_from, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      slug,
      body.title,
      body.description ?? null,
      body.type,
      body.status,
      auth.userId,
      Math.round(body.price * 100),
      body.currency,
      body.deposit === undefined ? null : Math.round(body.deposit * 100),
      body.minimum_lease_months ?? null,
      body.address_line1,
      body.address_line2 ?? null,
      body.city,
      body.state,
      body.zip_code,
      body.country,
      body.latitude ?? null,
      body.longitude ?? null,
      body.bedrooms,
      body.bathrooms,
      body.area_sqft ?? null,
      body.year_built ?? null,
      JSON.stringify(body.amenities),
      JSON.stringify(body.images),
      body.featured ? 1 : 0,
      body.available_from ?? null,
      nowIso(),
      nowIso(),
    ]
  );

  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'property.created',
    resourceType: 'property',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
  });
  await invalidatePropertyCaches(c);

  const createdRow = await properties.byId(c.env.DB, id);
  return created({ data: createdRow ? toPropertyDto(createdRow) : null });
});

propertyRoutes.put('/:id', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');

  const existing = await properties.byId(c.env.DB, id);
  if (!existing) throw ApiError.notFound('That listing');

  // Ownership is enforced here, not in the UI: being a landlord is not enough,
  // the caller must own *this* listing.
  const isOwner = existing.landlord_id === auth.userId;
  const isAdmin = auth.role === 'admin' || auth.role === 'manager';
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You can only edit your own listings.');
  }

  const body = validate(propertyInputSchema.partial(), await parseJsonBody(c.req.raw));
  const assignments: string[] = [];
  const params: unknown[] = [];

  const set = (column: string, value: unknown) => {
    assignments.push(`${column} = ?`);
    params.push(value);
  };

  if (body.title !== undefined) {
    set('title', body.title);
    set('slug', await uniqueSlug(c, body.title, id));
  }
  if (body.description !== undefined) set('description', body.description);
  if (body.type !== undefined) set('type', body.type);
  if (body.status !== undefined) set('status', body.status);
  if (body.price !== undefined) set('price_amount', Math.round(body.price * 100));
  if (body.currency !== undefined) set('currency', body.currency);
  if (body.deposit !== undefined) set('deposit_amount', Math.round(body.deposit * 100));
  if (body.minimum_lease_months !== undefined) set('minimum_lease_months', body.minimum_lease_months);
  if (body.address_line1 !== undefined) set('address_line1', body.address_line1);
  if (body.address_line2 !== undefined) set('address_line2', body.address_line2);
  if (body.city !== undefined) set('city', body.city);
  if (body.state !== undefined) set('state', body.state);
  if (body.zip_code !== undefined) set('zip_code', body.zip_code);
  if (body.country !== undefined) set('country', body.country);
  if (body.latitude !== undefined) set('latitude', body.latitude);
  if (body.longitude !== undefined) set('longitude', body.longitude);
  if (body.bedrooms !== undefined) set('bedrooms', body.bedrooms);
  if (body.bathrooms !== undefined) set('bathrooms', body.bathrooms);
  if (body.area_sqft !== undefined) set('area_sqft', body.area_sqft);
  if (body.year_built !== undefined) set('year_built', body.year_built);
  if (body.amenities !== undefined) set('amenities', JSON.stringify(body.amenities));
  if (body.images !== undefined) set('images', JSON.stringify(body.images));
  if (body.featured !== undefined) set('featured', body.featured ? 1 : 0);
  if (body.available_from !== undefined) set('available_from', body.available_from);

  if (assignments.length === 0) throw ApiError.badRequest('Nothing to update.');

  assignments.push('updated_at = ?');
  params.push(nowIso(), id);

  await execute(c.env.DB, `UPDATE properties SET ${assignments.join(', ')} WHERE id = ?`, params);
  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'property.updated',
    resourceType: 'property',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
  });
  await invalidatePropertyCaches(c);

  const updated = await properties.byId(c.env.DB, id);
  return ok({ data: updated ? toPropertyDto(updated) : null });
});

propertyRoutes.delete('/:id', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const existing = await properties.byId(c.env.DB, id);
  if (!existing) throw ApiError.notFound('That listing');

  const isOwner = existing.landlord_id === auth.userId;
  const isAdmin = auth.role === 'admin' || auth.role === 'manager';
  if (!isOwner && !isAdmin) throw ApiError.forbidden('You can only delete your own listings.');

  // Soft delete: bookings, maintenance history and conversations reference this
  // listing and must survive for the people involved in them.
  await execute(c.env.DB, `UPDATE properties SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    nowIso(),
    nowIso(),
    id,
  ]);
  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'property.deleted',
    resourceType: 'property',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
  });
  await invalidatePropertyCaches(c);

  return noContent();
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normaliseList(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? value : value.split(',');
  const cleaned = list.map((entry) => entry.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Slugs stay unique by suffixing — an existing slug is never stolen. */
async function uniqueSlug(c: AppContext, title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!(await properties.slugExists(c.env.DB, candidate, excludeId))) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * KV list caches are key-prefixed, which KV cannot enumerate. We bump a
 * generation counter and include it in the key so every cached page is
 * abandoned at once after a write.
 */
async function invalidatePropertyCaches(c: AppContext): Promise<void> {
  const generation = Number((await c.env.CACHE.get('properties:generation')) ?? '0') + 1;
  await c.env.CACHE.put('properties:generation', String(generation));
  // The route key includes the generation on the next read; the old entries
  // simply expire. This keeps invalidation O(1) instead of a KV list scan.
  await c.env.CACHE.put('properties:cache_epoch', String(Date.now()));
}

/** Exposed for the landlord portal: who owns a listing. */
export async function landlordOf(db: D1Database, propertyId: string): Promise<string | null> {
  const row = await queryOne<{ landlord_id: string }>(
    db,
    `SELECT landlord_id FROM properties WHERE id = ? AND deleted_at IS NULL`,
    [propertyId]
  );
  return row?.landlord_id ?? null;
}

export async function landlordContact(db: D1Database, landlordId: string) {
  const user = await users.publicById(db, landlordId);
  return user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null;
}
