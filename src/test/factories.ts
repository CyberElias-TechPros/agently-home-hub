import type { Booking, PropertySummary, User } from '@/lib/api/types';

/** Builders keep fixtures honest: one place defines what a record looks like. */

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Tunde Bakare',
    email: 'tunde@example.com',
    role: 'tenant',
    phone: null,
    avatar_url: null,
    verified: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeProperty(overrides: Partial<PropertySummary> = {}): PropertySummary {
  return {
    id: 'prop-1',
    title: 'Sunlit 2-bed apartment in Lekki Phase 1',
    description: 'A bright two-bedroom apartment.',
    type: 'apartment',
    // Money is in MAJOR units: ₦4,500,000 per year.
    price: 4_500_000,
    currency: 'NGN',
    status: 'available',
    landlord_id: 'landlord-1',
    address_line1: '14 Admiralty Way',
    address_line2: null,
    city: 'Lekki',
    state: 'Lagos',
    zip_code: '106104',
    country: 'Nigeria',
    latitude: 6.4474,
    longitude: 3.4703,
    bedrooms: 2,
    bathrooms: 2,
    area_sqft: 1150,
    year_built: null,
    amenities: ['parking', 'generator'],
    images: [],
    featured: false,
    available_from: null,
    minimum_lease_months: 12,
    deposit: 450_000,
    slug: 'sunlit-2-bed-apartment-in-lekki-phase-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    landlord_name: 'Amara Okafor',
    ...overrides,
  };
}

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-1',
    property_id: 'prop-1',
    tenant_id: 'user-1',
    landlord_id: 'landlord-1',
    start_date: '2026-10-01',
    end_date: null,
    message: null,
    status: 'pending',
    monthly_rent: 375_000,
    deposit: null,
    currency: 'NGN',
    decided_at: null,
    decision_reason: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    property_title: 'Sunlit 2-bed apartment in Lekki Phase 1',
    property_address: '14 Admiralty Way',
    tenant_name: 'Tunde Bakare',
    landlord_name: 'Amara Okafor',
    ...overrides,
  };
}
