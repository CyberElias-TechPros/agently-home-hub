import { http } from './http';
import type {
  AdminUser,
  AuthSession,
  Booking,
  BookingStatus,
  Commission,
  Conversation,
  DashboardSummary,
  DocumentCategory,
  DocumentUploadIntent,
  Lead,
  LeadStatistics,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
  Message,
  Notification,
  Paginated,
  PlatformAnalytics,
  Property,
  PropertyQuery,
  PropertySummary,
  RoommateApplication,
  RoommateMatch,
  RoommateProfile,
  RoommateProfileInput,
  Showing,
  ShowingStatus,
  User,
  Vendor,
  VendorBooking,
  VendorReview,
  UserDocument,
} from './types';

export * from './http';
export * from './types';

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'tenant' | 'landlord' | 'agent';
  phone?: string;
}

export const authApi = {
  register: (input: RegisterInput) =>
    http.post<{ data: AuthSession }>('/auth/register', input, { authenticated: false }),
  login: (input: { email: string; password: string }) =>
    http.post<{ data: AuthSession }>('/auth/login', input, { authenticated: false }),
  refresh: (refresh_token: string) =>
    http.post<{ data: { tokens: AuthSession['tokens'] } }>('/auth/refresh', { refresh_token }, { authenticated: false }),
  logout: (refresh_token: string | null) =>
    http.post<{ success: true }>('/auth/logout', refresh_token ? { refresh_token } : {}),
  me: () => http.get<{ data: { user: User } }>('/auth/me'),
  requestPasswordReset: (email: string) =>
    http.post<{ success: true }>('/auth/password/forgot', { email }, { authenticated: false }),
  resetPassword: (input: { token: string; password: string }) =>
    http.post<{ success: true }>('/auth/password/reset', input, { authenticated: false }),
  verifyEmail: (token: string) =>
    http.post<{ success: true }>('/auth/verify-email', { token }, { authenticated: false }),
};

/* ------------------------------------------------------------------ */
/* Properties                                                          */
/* ------------------------------------------------------------------ */

export type CreatePropertyInput = Partial<Property> &
  Pick<Property, 'title' | 'type' | 'price' | 'address_line1' | 'city' | 'state' | 'zip_code'>;

export const propertiesApi = {
  list: (query: PropertyQuery = {}) => {
    const { amenities, ...rest } = query;
    return http.get<Paginated<PropertySummary>>('/properties', {
      authenticated: false,
      query: { ...rest, amenities },
    });
  },
  featured: (limit = 6) =>
    http.get<{ data: PropertySummary[] }>('/properties/featured', {
      authenticated: false,
      query: { limit },
    }),
  get: (idOrSlug: string) =>
    http.get<{ data: PropertySummary }>(`/properties/${encodeURIComponent(idOrSlug)}`, {
      authenticated: false,
    }),
  create: (input: CreatePropertyInput) => http.post<{ data: Property }>('/properties', input),
  update: (id: string, input: Partial<Property>) =>
    http.put<{ data: Property }>(`/properties/${encodeURIComponent(id)}`, input),
  remove: (id: string) => http.delete<{ success: true }>(`/properties/${encodeURIComponent(id)}`),
  mine: () => http.get<Paginated<PropertySummary>>('/properties/mine'),
};

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

export interface CreateBookingInput {
  property_id: string;
  start_date: string;
  end_date?: string;
  message?: string;
}

export const bookingsApi = {
  list: () => http.get<{ data: Booking[] }>('/bookings'),
  create: (input: CreateBookingInput) => http.post<{ data: Booking }>('/bookings', input),
  decide: (id: string, decision: Extract<BookingStatus, 'approved' | 'rejected' | 'cancelled'>, reason?: string) =>
    http.post<{ data: Booking }>(`/bookings/${encodeURIComponent(id)}/decision`, {
      decision,
      reason,
    }),
};

/* ------------------------------------------------------------------ */
/* Maintenance                                                         */
/* ------------------------------------------------------------------ */

export interface CreateMaintenanceInput {
  property_id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  area_affected?: string;
  access_instructions?: string;
  images?: string[];
}

export interface UpdateMaintenanceInput {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  contractor_id?: string | null;
  landlord_notes?: string;
  contractor_notes?: string;
  estimated_cost?: number | null;
  actual_cost?: number | null;
}

export const maintenanceApi = {
  list: (query: { status?: MaintenanceStatus; property_id?: string } = {}) =>
    http.get<{ data: MaintenanceRequest[] }>('/maintenance', { query }),
  create: (input: CreateMaintenanceInput) => http.post<{ data: MaintenanceRequest }>('/maintenance', input),
  update: (id: string, input: UpdateMaintenanceInput) =>
    http.patch<{ data: MaintenanceRequest }>(`/maintenance/${encodeURIComponent(id)}`, input),
};

/* ------------------------------------------------------------------ */
/* Messaging                                                           */
/* ------------------------------------------------------------------ */

export const messagesApi = {
  conversations: () => http.get<{ data: Conversation[] }>('/conversations'),
  start: (input: { participant_id: string; property_id?: string; content: string }) =>
    http.post<{ data: { conversation: Conversation; message: Message } }>('/conversations', input),
  messages: (conversationId: string, options?: { signal?: AbortSignal }) =>
    http.get<{ data: Message[] }>(`/conversations/${encodeURIComponent(conversationId)}/messages`, options),
  send: (conversationId: string, content: string) =>
    http.post<{ data: Message }>(`/conversations/${encodeURIComponent(conversationId)}/messages`, { content }),
  markRead: (conversationId: string) =>
    http.post<{ success: true }>(`/conversations/${encodeURIComponent(conversationId)}/read`),
};

/* ------------------------------------------------------------------ */
/* Documents (R2-backed)                                               */
/* ------------------------------------------------------------------ */

export const documentsApi = {
  list: () => http.get<{ data: UserDocument[] }>('/documents'),
  createUploadIntent: (input: { name: string; category: DocumentCategory; mime_type: string; size_bytes: number; property_id?: string }) =>
    http.post<{ data: DocumentUploadIntent }>('/documents/upload-intent', input),
  complete: (id: string) =>
    http.post<{ data: UserDocument }>(`/documents/${encodeURIComponent(id)}/complete`),
  download: (id: string) => http.get<{ data: { url: string; expires_at: string } }>(`/documents/${encodeURIComponent(id)}/download`),
  remove: (id: string) => http.delete<{ success: true }>(`/documents/${encodeURIComponent(id)}`),
};

/* ------------------------------------------------------------------ */
/* Agent CRM                                                           */
/* ------------------------------------------------------------------ */

export type CreateLeadInput = Partial<Lead> & Pick<Lead, 'first_name' | 'last_name'>;

export const leadsApi = {
  list: () => http.get<{ data: Lead[] }>('/leads'),
  statistics: () => http.get<{ data: LeadStatistics }>('/leads/statistics'),
  create: (input: CreateLeadInput) => http.post<{ data: Lead }>('/leads', input),
  update: (id: string, input: Partial<Lead>) =>
    http.put<{ data: Lead }>(`/leads/${encodeURIComponent(id)}`, input),
  updateStatus: (id: string, status: Lead['status']) =>
    http.patch<{ data: Lead }>(`/leads/${encodeURIComponent(id)}/status`, { status }),
  /** Registered before `/leads/:id` on the server so it is never shadowed. */
  showings: () => http.get<{ data: Showing[] }>('/leads/showings'),
  scheduleShowing: (input: {
    lead_id: string;
    property_id: string;
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes?: number;
    notes?: string;
  }) => http.post<{ data: Showing }>('/leads/showings', input),
  updateShowingStatus: (id: string, status: ShowingStatus) =>
    http.patch<{ data: Showing }>(`/leads/showings/${encodeURIComponent(id)}`, { status }),
  commissions: () => http.get<{ data: Commission[] }>('/leads/commissions'),
  updateCommissionStatus: (id: string, status: Commission['status']) =>
    http.patch<{ data: Commission }>(`/leads/commissions/${encodeURIComponent(id)}`, { status }),
};

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export const notificationsApi = {
  list: () => http.get<{ data: Notification[] }>('/notifications'),
  unreadCount: () => http.get<{ data: { count: number } }>('/notifications/unread-count'),
  markRead: (id: string) => http.post<{ success: true }>(`/notifications/${encodeURIComponent(id)}/read`),
  markAllRead: () => http.post<{ success: true }>('/notifications/read-all'),
};

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export const adminApi = {
  analytics: () => http.get<{ data: PlatformAnalytics }>('/admin/analytics'),
  users: (query: { role?: string; q?: string; page?: number; per_page?: number } = {}) =>
    http.get<Paginated<AdminUser>>('/admin/users', { query }),
  setUserRole: (id: string, role: User['role']) =>
    http.patch<{ data: AdminUser }>(`/admin/users/${encodeURIComponent(id)}/role`, { role }),
  disableUser: (id: string, disabled: boolean) =>
    http.patch<{ data: AdminUser }>(`/admin/users/${encodeURIComponent(id)}/disabled`, { disabled }),
};

/* ------------------------------------------------------------------ */
/* Vendors                                                             */
/* ------------------------------------------------------------------ */

export const vendorsApi = {
  list: (query: { category?: string; q?: string; page?: number; per_page?: number } = {}) =>
    http.get<Paginated<Vendor>>('/vendors', { query }),
  bookings: () => http.get<{ data: VendorBooking[] }>('/vendors/bookings'),
  book: (input: {
    contractor_id: string;
    maintenance_request_id?: string;
    scheduled_for?: string;
    description: string;
    quoted_amount?: number;
  }) => http.post<{ data: VendorBooking }>('/vendors/bookings', input),
  review: (input: { contractor_id: string; rating: number; comment?: string }) =>
    http.post<{ data: VendorReview }>('/vendors/reviews', input),
  reviews: (id: string) =>
    http.get<{ data: VendorReview[] }>(`/vendors/${encodeURIComponent(id)}/reviews`),
};

/* ------------------------------------------------------------------ */
/* Roommates                                                           */
/* ------------------------------------------------------------------ */

export const roommatesApi = {
  profiles: (query: { city?: string; page?: number; per_page?: number } = {}) =>
    http.get<{ data: RoommateMatch[] }>('/roommates/profiles', { query }),
  matches: () => http.get<{ data: RoommateMatch[] }>('/roommates/matches'),
  profile: () => http.get<{ data: RoommateProfile | null }>('/roommates/profile'),
  saveProfile: (input: RoommateProfileInput) =>
    http.put<{ data: RoommateProfile | null }>('/roommates/profile', input),
  apply: (input: { recipient_id: string; message?: string }) =>
    http.post<{ data: RoommateApplication }>('/roommates/applications', input),
  applications: () => http.get<{ data: RoommateApplication[] }>('/roommates/applications'),
  respond: (id: string, status: 'accepted' | 'declined') =>
    http.patch<{ data: RoommateApplication }>(`/roommates/applications/${encodeURIComponent(id)}`, { status }),
};

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export const profileApi = {
  get: () => http.get<{ data: { user: User } }>('/profile'),
  update: (input: { name?: string; phone?: string; avatar_url?: string }) =>
    http.patch<{ data: { user: User } }>('/profile', input),
  changePassword: (input: { current_password: string; new_password: string }) =>
    http.post<{ success: true }>('/profile/password', input),
  summary: () => http.get<{ data: DashboardSummary }>('/profile/summary'),
};

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export const systemApi = {
  health: () => http.get<{ status: string; version: string }>('/health', { authenticated: false }),
};
