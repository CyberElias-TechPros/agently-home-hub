/**
 * Canonical API contract types.
 *
 * These types describe the **wire format** actually produced by the Agently API
 * (Cloudflare Worker + D1). The persistence layer, the API and this file all use
 * `snake_case`, so a single model is shared end-to-end and cannot drift.
 *
 * Everything here is server-owned truth: the frontend must never invent fields
 * that the API does not return.
 */

export type UserRole = 'tenant' | 'landlord' | 'agent' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

/* ------------------------------------------------------------------ */
/* Properties                                                          */
/* ------------------------------------------------------------------ */

export type PropertyType = 'apartment' | 'house' | 'condo' | 'townhouse' | 'studio' | 'room';
export type PropertyStatus = 'available' | 'occupied' | 'maintenance' | 'unavailable' | 'draft';

export interface Property {
  id: string;
  title: string;
  description: string | null;
  type: PropertyType;
  price: number;
  currency: string;
  status: PropertyStatus;
  landlord_id: string;
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
  minimum_lease_months: number | null;
  deposit: number | null;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface PropertySummary extends Property {
  landlord_name: string | null;
}

export interface PropertyQuery {
  q?: string;
  city?: string;
  state?: string;
  type?: PropertyType | PropertyType[];
  status?: PropertyStatus;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  per_page?: number;
}

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

export interface Booking {
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
  decided_at: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
  property_title?: string;
  property_address?: string;
  property_city?: string;
  tenant_name?: string;
  landlord_name?: string;
}

/* ------------------------------------------------------------------ */
/* Maintenance                                                         */
/* ------------------------------------------------------------------ */

export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'structural'
  | 'pest_control'
  | 'cleaning'
  | 'other';

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'emergency';
export type MaintenanceStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface MaintenanceRequest {
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
  /** SLA the landlord is measured against, derived from the priority. */
  response_target_hours: number;
  assigned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  property_title?: string;
  property_address?: string;
  tenant_name?: string;
  landlord_name?: string;
}

/* ------------------------------------------------------------------ */
/* Messaging                                                           */
/* ------------------------------------------------------------------ */

export interface Conversation {
  id: string;
  participant_one_id: string;
  participant_two_id: string;
  property_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  /** Resolved for the requesting user. */
  counterpart: Pick<User, 'id' | 'name' | 'avatar_url' | 'role'> | null;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system';
  read_at: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export type DocumentCategory =
  | 'lease'
  | 'identity'
  | 'proof_of_income'
  | 'insurance'
  | 'inspection'
  | 'receipt'
  | 'other';

export interface UserDocument {
  id: string;
  owner_id: string;
  property_id: string | null;
  name: string;
  category: DocumentCategory;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentUploadIntent {
  document: UserDocument;
  upload_url: string;
  method: 'PUT';
  required_headers: Record<string, string>;
  expires_at: string;
}

/* ------------------------------------------------------------------ */
/* Agent CRM                                                           */
/* ------------------------------------------------------------------ */

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'qualified'
  | 'viewing_scheduled'
  | 'viewing_completed'
  | 'offer_made'
  | 'closed_won'
  | 'closed_lost';

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  property_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_locations: string[];
  preferred_property_types: string[];
  preferred_bedrooms: number | null;
  preferred_bathrooms: number | null;
  move_in_date: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  agent_id: string | null;
  lead_score: number;
  conversion_probability: number;
  estimated_commission: number | null;
  notes: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  property_title?: string | null;
  agent_name?: string | null;
}

export interface LeadStatistics {
  total_leads: number;
  new_leads: number;
  contacted_leads: number;
  qualified_leads: number;
  closed_won_leads: number;
  closed_lost_leads: number;
  conversion_rate: number;
  avg_lead_score: number;
  leads_this_month: number;
  leads_this_week: number;
}

export type ShowingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Showing {
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
  status: ShowingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  agent_id: string;
  lead_id: string | null;
  property_id: string | null;
  deal_value: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'earned' | 'paid' | 'cancelled';
  closing_date: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  resource_type: string | null;
  resource_id: string | null;
  read_at: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Admin / platform                                                    */
/* ------------------------------------------------------------------ */

export interface PlatformAnalytics {
  total_users: number;
  total_properties: number;
  total_bookings: number;
  open_maintenance_requests: number;
  new_users_last_30_days: number;
  users_by_role: Record<string, number>;
  bookings_by_status: Record<string, number>;
}

export interface AdminUser extends User {
  last_login_at: string | null;
  disabled_at: string | null;
}

/* ------------------------------------------------------------------ */
/* Shared envelopes                                                    */
/* ------------------------------------------------------------------ */

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: unknown;
  };
}

/* ------------------------------------------------------------------ */
/* Vendors (service providers)                                         */
/* ------------------------------------------------------------------ */

export interface Vendor {
  id: string;
  business_name: string;
  description: string | null;
  categories: string[];
  service_areas: string[];
  hourly_rate: number | null;
  currency: string;
  rating: number;
  review_count: number;
  verified: boolean;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorReview {
  id: string;
  contractor_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface VendorBooking {
  id: string;
  contractor_id: string;
  client_id: string;
  maintenance_request_id: string | null;
  status: 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_for: string | null;
  description: string;
  quoted_amount: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Roommates                                                           */
/* ------------------------------------------------------------------ */

export interface RoommateProfile {
  id: string;
  user_id: string;
  headline: string | null;
  bio: string | null;
  age: number | null;
  occupation: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_city: string | null;
  smoking: boolean;
  pets: boolean;
  night_owl: boolean;
  /** Self-rated 1–5. */
  cleanliness: number;
  /** Self-rated 1–5. */
  social_level: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoommateMatch extends RoommateProfile {
  name: string | null;
  avatar_url: string | null;
  /** 0–100, or null until the viewer has saved their own profile. */
  match_score: number | null;
  match_reasons: string[];
}

export interface RoommateApplication {
  id: string;
  applicant_id: string;
  recipient_id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}

export type RoommateProfileInput = Partial<
  Pick<
    RoommateProfile,
    'headline' | 'bio' | 'age' | 'occupation' | 'budget_min' | 'budget_max' | 'preferred_city' | 'smoking' | 'pets' | 'night_owl' | 'cleanliness' | 'social_level'
  >
>;

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export interface DashboardSummary {
  active_bookings: Booking[];
  open_maintenance: number;
  unread_notifications: number;
  my_properties: PropertySummary[];
}
