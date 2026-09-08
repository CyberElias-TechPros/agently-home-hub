export const LEAD_STATUSES = [
  'new',
  'contacted',
  'interested',
  'qualified',
  'viewing_scheduled',
  'viewing_completed',
  'offer_made',
  'closed_won',
  'closed_lost',
] as const;

export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const SHOWING_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;
export const COMMISSION_STATUSES = ['pending', 'earned', 'paid', 'cancelled'] as const;

export interface LeadRow {
  id: string;
  agent_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  property_id: string | null;
  budget_min_amount: number | null;
  budget_max_amount: number | null;
  preferred_locations: string;
  preferred_property_types: string;
  preferred_bedrooms: number | null;
  preferred_bathrooms: number | null;
  move_in_date: string | null;
  status: string;
  priority: string;
  lead_score: number;
  conversion_probability: number;
  estimated_commission_amount: number | null;
  notes: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  property_title?: string | null;
  agent_name?: string | null;
}

export interface ShowingRow {
  id: string;
  lead_id: string;
  property_id: string;
  agent_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  property_address: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionRow {
  id: string;
  agent_id: string;
  lead_id: string | null;
  property_id: string | null;
  deal_value_amount: number;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  status: string;
  closing_date: string | null;
  payment_date: string | null;
  notes: string | null;
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

function money(value: number | null): number | null {
  return value === null ? null : value / 100;
}

export function toLeadDto(row: LeadRow) {
  return {
    id: row.id,
    agent_id: row.agent_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    source: row.source,
    property_id: row.property_id,
    budget_min: money(row.budget_min_amount),
    budget_max: money(row.budget_max_amount),
    preferred_locations: list(row.preferred_locations),
    preferred_property_types: list(row.preferred_property_types),
    preferred_bedrooms: row.preferred_bedrooms,
    preferred_bathrooms: row.preferred_bathrooms,
    move_in_date: row.move_in_date,
    status: row.status,
    priority: row.priority,
    lead_score: row.lead_score,
    conversion_probability: row.conversion_probability,
    estimated_commission: money(row.estimated_commission_amount),
    notes: row.notes,
    last_contacted_at: row.last_contacted_at,
    next_follow_up_at: row.next_follow_up_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    property_title: row.property_title ?? null,
    agent_name: row.agent_name ?? null,
  };
}

export function toShowingDto(row: ShowingRow) {
  return {
    id: row.id,
    lead_id: row.lead_id,
    property_id: row.property_id,
    agent_id: row.agent_id,
    client_name: row.client_name,
    client_email: row.client_email,
    client_phone: row.client_phone,
    property_address: row.property_address,
    scheduled_date: row.scheduled_date,
    scheduled_time: row.scheduled_time,
    duration_minutes: row.duration_minutes,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toCommissionDto(row: CommissionRow) {
  return {
    id: row.id,
    agent_id: row.agent_id,
    lead_id: row.lead_id,
    property_id: row.property_id,
    deal_value: money(row.deal_value_amount) ?? 0,
    commission_rate: row.commission_rate,
    commission_amount: money(row.commission_amount) ?? 0,
    currency: row.currency,
    status: row.status,
    closing_date: row.closing_date,
    payment_date: row.payment_date,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
