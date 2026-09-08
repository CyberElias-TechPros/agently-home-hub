import { ApiError } from '../lib/errors';
import type { PropertyQueryRow } from '../repositories/properties';

export type PropertyType = 'apartment' | 'house' | 'condo' | 'townhouse' | 'studio' | 'room';
export type PropertyStatus = 'available' | 'occupied' | 'maintenance' | 'unavailable' | 'draft';

export const PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'condo', 'townhouse', 'studio', 'room'];
export const PROPERTY_STATUSES: PropertyStatus[] = [
  'available',
  'occupied',
  'maintenance',
  'unavailable',
  'draft',
];

/** Amenity vocabulary kept in one place so filters and forms cannot drift. */
export const AMENITIES = [
  'parking',
  'gym',
  'pool',
  'pet-friendly',
  'laundry',
  'air-conditioning',
  'heating',
  'furnished',
  'balcony',
  'garden',
  'security',
  'generator',
  'borehole',
  'wifi',
  'elevator',
  'backup-power',
  'water-heater',
  'fitted-kitchen',
] as const;

export interface PropertyDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: PropertyType;
  status: PropertyStatus;
  landlord_id: string;
  price: number;
  currency: string;
  deposit: number | null;
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
  amenities: string[];
  images: string[];
  featured: boolean;
  available_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertySummaryDto extends PropertyDto {
  landlord_name: string | null;
}

export function toPropertyDto(row: PropertyQueryRow): PropertySummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    landlord_id: row.landlord_id,
    price: row.price_amount / 100,
    currency: row.currency,
    deposit: row.deposit_amount === null ? null : row.deposit_amount / 100,
    minimum_lease_months: row.minimum_lease_months,
    address_line1: row.address_line1,
    address_line2: row.address_line2,
    city: row.city,
    state: row.state,
    zip_code: row.zip_code,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    area_sqft: row.area_sqft,
    year_built: row.year_built,
    amenities: safeParseList(row.amenities),
    images: safeParseList(row.images),
    featured: row.featured === 1,
    available_from: row.available_from,
    created_at: row.created_at,
    updated_at: row.updated_at,
    landlord_name: row.landlord_name,
  };
}

function safeParseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

/** Full address used in listings, notifications and structured data. */
export function formatAddress(property: Pick<PropertyDto, 'address_line1' | 'address_line2' | 'city' | 'state' | 'zip_code' | 'country'>): string {
  return [property.address_line1, property.address_line2, property.city, property.state, property.zip_code, property.country]
    .filter((part) => Boolean(part && String(part).trim()))
    .join(', ');
}

/**
 * URL-safe slug from a listing title.
 *
 * Slugs are made unique by the caller (a numeric suffix is appended on
 * collision) — never silently overwritten, so old links keep working.
 */
export function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');
  return base || 'listing';
}

export function assertPropertyType(value: string): asserts value is PropertyType {
  if (!(PROPERTY_TYPES as string[]).includes(value)) {
    throw ApiError.validation(`"${value}" is not a supported property type.`);
  }
}
