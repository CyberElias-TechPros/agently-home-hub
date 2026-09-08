export const VENDOR_CATEGORIES = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance-repair',
  'carpentry',
  'painting',
  'cleaning',
  'pest-control',
  'roofing',
  'security',
  'landscaping',
  'general',
] as const;

export interface ContractorRow {
  id: string;
  user_id: string | null;
  business_name: string;
  description: string | null;
  categories: string;
  service_areas: string;
  hourly_rate_amount: number | null;
  currency: string;
  rating: number;
  review_count: number;
  verified: number;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorBookingRow {
  id: string;
  contractor_id: string;
  requested_by: string;
  maintenance_request_id: string | null;
  scheduled_for: string | null;
  description: string | null;
  status: string;
  quoted_amount: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

function list(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

export function toContractorDto(row: ContractorRow) {
  return {
    id: row.id,
    business_name: row.business_name,
    description: row.description,
    categories: list(row.categories),
    service_areas: list(row.service_areas),
    hourly_rate: row.hourly_rate_amount === null ? null : row.hourly_rate_amount / 100,
    currency: row.currency,
    rating: Number(row.rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    verified: row.verified === 1,
    phone: row.phone,
    email: row.email,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
