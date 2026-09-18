/**
 * Backend data-source helpers.
 *
 * The real API lives behind `/api` (served by the Cloudflare Worker). Many
 * product areas in this codebase don't have a persisted backend model yet,
 * so we provide `mockIfEmpty` / `fallback` adapters that return curated
 * local data when the network is unavailable — keeping every page a happy
 * path. Real endpoints are always tried first.
 */

import { mockProperties } from './mockData';

/** Convert a raw API property row (snake_case) to the frontend `Property` shape. */
export function normalizeProperty(raw: any): any {
  if (!raw) return raw;
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    type: raw.type,
    price: raw.price,
    currency: raw.currency ?? 'USD',
    location: {
      address: raw.location?.address ?? raw.address ?? '',
      city: raw.location?.city ?? raw.city ?? '',
      state: raw.location?.state ?? raw.state ?? '',
      zipCode: raw.location?.zipCode ?? raw.zip_code ?? '',
      coordinates: raw.location?.coordinates ?? { lat: raw.lat ?? null, lng: raw.lng ?? null },
    },
    images: Array.isArray(raw.images) ? raw.images : [],
    bedrooms: raw.bedrooms ?? 0,
    bathrooms: raw.bathrooms ?? 0,
    area: raw.area ?? 0,
    yearBuilt: raw.yearBuilt ?? raw.year_built ?? null,
    amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
    status: raw.status ?? 'available',
    landlordId: raw.landlordId ?? raw.landlord_id ?? null,
    availableFrom: raw.availableFrom ?? raw.available_from ?? null,
    rules: raw.rules ?? null,
    featured: Boolean(raw.featured),
    verified: Boolean(raw.verified),
    landlord: raw.landlord ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
  };
}

export function normalizePropertyList(list: unknown): any[] {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeProperty);
}

/** Real list endpoint → normalized properties, with mock fallback when offline. */
export async function fallbackProperties(fetcher: () => Promise<any[]>): Promise<any[]> {
  try {
    const list = await fetcher();
    if (Array.isArray(list) && list.length > 0) return normalizePropertyList(list);
  } catch {
    // offline or backend not reachable
  }
  return [...mockProperties];
}

/** Map the API image paths to usable URLs. */
export function resolveImage(path: string | undefined): string {
  if (!path) return '/src/assets/property-1.jpg';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (path.startsWith('/src/assets/') || path.startsWith('/')) return path;
  return `/src/assets/${path}`;
}
