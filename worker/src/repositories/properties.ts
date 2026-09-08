import { nowIso, parseJsonList, placeholders, queryAll, queryOne } from './db';
import type { PropertyStatus, PropertyType } from '../domain/property';

export interface PropertyRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: PropertyType;
  status: PropertyStatus;
  landlord_id: string;
  price_amount: number;
  currency: string;
  deposit_amount: number | null;
  minimum_lease_months: number | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number | null;
  year_built: number | null;
  amenities: string;
  images: string;
  featured: number;
  available_from: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PropertyQueryRow extends PropertyRow {
  landlord_name: string | null;
}

export interface SearchFilters {
  q?: string;
  city?: string;
  state?: string;
  types?: PropertyType[];
  status?: PropertyStatus;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  page: number;
  perPage: number;
}

const BASE_SELECT = `
  SELECT p.*, u.name AS landlord_name
    FROM properties p
    LEFT JOIN users u ON u.id = p.landlord_id
`;

export const properties = {
  byId: (db: D1Database, id: string) =>
    queryOne<PropertyQueryRow>(db, `${BASE_SELECT} WHERE p.id = ? AND p.deleted_at IS NULL`, [id]),

  bySlug: (db: D1Database, slug: string) =>
    queryOne<PropertyQueryRow>(db, `${BASE_SELECT} WHERE p.slug = ? AND p.deleted_at IS NULL`, [slug]),

  listByLandlord: (db: D1Database, landlordId: string) =>
    queryAll<PropertyQueryRow>(
      db,
      `${BASE_SELECT} WHERE p.landlord_id = ? AND p.deleted_at IS NULL ORDER BY p.created_at DESC`,
      [landlordId]
    ),

  featured: (db: D1Database, limit: number) =>
    queryAll<PropertyQueryRow>(
      db,
      `${BASE_SELECT}
        WHERE p.deleted_at IS NULL AND p.status = 'available' AND p.featured = 1
        ORDER BY p.created_at DESC
        LIMIT ?`,
      [limit]
    ),

  /**
   * Paginated search.
   *
   * Ordering is always anchored on `created_at DESC` as the final tiebreaker so
   * pages cannot shuffle rows between requests (unstable pagination is the
   * classic cause of "I already saw that listing" on page two).
   */
  search: async (
    db: D1Database,
    filters: SearchFilters
  ): Promise<{ rows: PropertyQueryRow[]; total: number }> => {
    const where: string[] = ['p.deleted_at IS NULL'];
    const params: unknown[] = [];

    if (filters.q) {
      where.push('(lower(p.title) LIKE lower(?) OR lower(p.description) LIKE lower(?) OR lower(p.city) LIKE lower(?) OR lower(p.address_line1) LIKE lower(?))');
      const needle = `%${filters.q}%`;
      params.push(needle, needle, needle, needle);
    }
    if (filters.city) {
      where.push('lower(p.city) = lower(?)');
      params.push(filters.city);
    }
    if (filters.state) {
      where.push('lower(p.state) = lower(?)');
      params.push(filters.state);
    }
    if (filters.types && filters.types.length > 0) {
      where.push(`p.type IN (${placeholders(filters.types.length)})`);
      params.push(...filters.types);
    }
    if (filters.status) {
      where.push('p.status = ?');
      params.push(filters.status);
    } else {
      // Public browsing should never surface drafts or hidden listings.
      where.push("p.status <> 'draft'");
    }
    if (filters.minPrice !== undefined) {
      where.push('p.price_amount >= ?');
      params.push(filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      where.push('p.price_amount <= ?');
      params.push(filters.maxPrice);
    }
    if (filters.bedrooms !== undefined) {
      where.push('p.bedrooms >= ?');
      params.push(filters.bedrooms);
    }
    if (filters.bathrooms !== undefined) {
      where.push('p.bathrooms >= ?');
      params.push(filters.bathrooms);
    }
    if (filters.amenities && filters.amenities.length > 0) {
      // Amenities live in a JSON array column: require every requested value.
      for (const amenity of filters.amenities) {
        where.push(`EXISTS (SELECT 1 FROM json_each(p.amenities) WHERE lower(json_each.value) = lower(?))`);
        params.push(amenity);
      }
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const orderBy = (() => {
      switch (filters.sort) {
        case 'price_asc':
          return 'p.price_amount ASC, p.created_at DESC';
        case 'price_desc':
          return 'p.price_amount DESC, p.created_at DESC';
        case 'newest':
          return 'p.created_at DESC';
        default:
          // Relevance: featured first, then a light keyword match on the title.
          return filters.q
            ? `CASE WHEN lower(p.title) LIKE lower(?) THEN 0 ELSE 1 END, p.featured DESC, p.created_at DESC`
            : 'p.featured DESC, p.created_at DESC';
      }
    })();

    const orderParams = filters.sort === undefined || filters.sort === 'relevance'
      ? filters.q
        ? [`%${filters.q}%`]
        : []
      : [];

    const totalRow = await queryOne<{ count: number }>(
      db,
      `SELECT COUNT(*) as count FROM properties p ${whereSql}`,
      params
    );

    const offset = (filters.page - 1) * filters.perPage;
    const rows = await queryAll<PropertyQueryRow>(
      db,
      `${BASE_SELECT} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...orderParams, ...params, filters.perPage, offset]
    );

    return { rows, total: totalRow?.count ?? 0 };
  },

  slugExists: async (db: D1Database, slug: string, excludeId?: string): Promise<boolean> => {
    const row = excludeId
      ? await queryOne<{ id: string }>(db, `SELECT id FROM properties WHERE slug = ? AND id <> ?`, [slug, excludeId])
      : await queryOne<{ id: string }>(db, `SELECT id FROM properties WHERE slug = ?`, [slug]);
    return row !== null;
  },

  countAll: (db: D1Database) =>
    queryOne<{ count: number }>(db, `SELECT COUNT(*) as count FROM properties WHERE deleted_at IS NULL`),

  countByStatus: async (db: D1Database): Promise<Record<string, number>> => {
    const rows = await queryAll<{ status: string; count: number }>(
      db,
      `SELECT status, COUNT(*) as count FROM properties WHERE deleted_at IS NULL GROUP BY status`
    );
    return Object.fromEntries(rows.map((row) => [row.status, row.count]));
  },

  nearby: (db: D1Database, args: { lat: number; lng: number; radiusKm: number; limit: number }) =>
    // Bounding box prefilter keeps the distance maths off the full table.
    queryAll<PropertyQueryRow>(
      db,
      `${BASE_SELECT}
        WHERE p.deleted_at IS NULL
          AND p.latitude BETWEEN ? AND ?
          AND p.longitude BETWEEN ? AND ?
        LIMIT ?`,
      [
        args.lat - args.radiusKm / 111,
        args.lat + args.radiusKm / 111,
        args.lng - args.radiusKm / (111 * Math.cos((args.lat * Math.PI) / 180)),
        args.lng + args.radiusKm / (111 * Math.cos((args.lat * Math.PI) / 180)),
        args.limit,
      ]
    ),
};

export function amenitiesOf(row: PropertyRow): string[] {
  return parseJsonList<string>(row.amenities);
}

export function imagesOf(row: PropertyRow): string[] {
  return parseJsonList<string>(row.images);
}

export function touchUpdatedAt(): string {
  return nowIso();
}
