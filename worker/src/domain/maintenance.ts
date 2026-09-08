export const MAINTENANCE_CATEGORIES = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'structural',
  'pest_control',
  'cleaning',
  'other',
] as const;

export const MAINTENANCE_PRIORITIES = ['low', 'medium', 'high', 'emergency'] as const;

export const MAINTENANCE_STATUSES = [
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'rejected',
] as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

/**
 * Published response targets.
 *
 * These are commitments the platform makes to tenants, so they are derived from
 * priority alone and surfaced on the request itself. They are not a guess at
 * when a contractor will actually arrive.
 */
export const RESPONSE_TARGET_HOURS: Record<MaintenancePriority, number> = {
  emergency: 4,
  high: 24,
  medium: 72,
  low: 168,
};

export interface MaintenanceRow {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  contractor_id: string | null;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  area_affected: string | null;
  access_instructions: string | null;
  images: string;
  tenant_notes: string | null;
  landlord_notes: string | null;
  contractor_notes: string | null;
  estimated_cost_amount: number | null;
  actual_cost_amount: number | null;
  currency: string;
  assigned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  property_title?: string;
  property_address?: string;
  tenant_name?: string;
  landlord_name?: string;
}

export interface MaintenanceDto {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  contractor_id: string | null;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  area_affected: string | null;
  access_instructions: string | null;
  images: string[];
  tenant_notes: string | null;
  landlord_notes: string | null;
  contractor_notes: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  currency: string;
  assigned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  /** Hours within which the platform aims to respond, based on priority. */
  response_target_hours: number;
  property_title?: string;
  property_address?: string;
  tenant_name?: string;
  landlord_name?: string;
}

function parseImages(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

export function toMaintenanceDto(row: MaintenanceRow): MaintenanceDto {
  return {
    id: row.id,
    property_id: row.property_id,
    tenant_id: row.tenant_id,
    landlord_id: row.landlord_id,
    contractor_id: row.contractor_id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    area_affected: row.area_affected,
    access_instructions: row.access_instructions,
    images: parseImages(row.images),
    tenant_notes: row.tenant_notes,
    landlord_notes: row.landlord_notes,
    contractor_notes: row.contractor_notes,
    estimated_cost: row.estimated_cost_amount === null ? null : row.estimated_cost_amount / 100,
    actual_cost: row.actual_cost_amount === null ? null : row.actual_cost_amount / 100,
    currency: row.currency,
    assigned_at: row.assigned_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    response_target_hours: RESPONSE_TARGET_HOURS[row.priority] ?? 72,
    property_title: row.property_title,
    property_address: row.property_address,
    tenant_name: row.tenant_name,
    landlord_name: row.landlord_name,
  };
}
