export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

export interface BookingRow {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  start_date: string;
  end_date: string | null;
  message: string | null;
  status: BookingStatus;
  monthly_rent_amount: number;
  deposit_amount: number | null;
  currency: string;
  decision_reason: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  property_title?: string;
  property_address?: string;
  property_city?: string;
  tenant_name?: string;
  landlord_name?: string;
}

export interface BookingDto {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  start_date: string;
  end_date: string | null;
  message: string | null;
  status: BookingStatus;
  monthly_rent: number;
  deposit: number | null;
  currency: string;
  decision_reason: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  property_title?: string;
  property_address?: string;
  property_city?: string;
  tenant_name?: string;
  landlord_name?: string;
}

export function toBookingDto(row: BookingRow): BookingDto {
  return {
    id: row.id,
    property_id: row.property_id,
    tenant_id: row.tenant_id,
    landlord_id: row.landlord_id,
    start_date: row.start_date,
    end_date: row.end_date,
    message: row.message,
    status: row.status,
    monthly_rent: row.monthly_rent_amount / 100,
    deposit: row.deposit_amount === null ? null : row.deposit_amount / 100,
    currency: row.currency,
    decision_reason: row.decision_reason,
    decided_at: row.decided_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    property_title: row.property_title,
    property_address: row.property_address,
    property_city: row.property_city,
    tenant_name: row.tenant_name,
    landlord_name: row.landlord_name,
  };
}
