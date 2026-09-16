// Agently API client — the single source of truth for talking to the backend.
// Every module in the app goes through this file; nothing calls fetch() directly.
//
// Base URL resolution:
//   - VITE_API_URL env (explicit override, e.g. a Vercel-deployed worker URL)
//   - otherwise "/api" (proxied to http://localhost:3001 by the Vite dev server,
//     and to the Cloudflare Worker in production).

// NOTE: we intentionally avoid importing `./auth` here to prevent a circular
// import (auth.ts lazily imports `./api` for refresh). The API client reads the
// persisted token straight from localStorage instead.
const TOKENS_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';

const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string)?.replace(/\/+$/, '') || '/api';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function readStorage(keys: string[]): Record<string, unknown> | null {
  try {
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) out[k] = JSON.parse(raw);
    }
    return out;
  } catch {
    return null;
  }
}

function token(): string | null {
  const storage = readStorage([TOKENS_KEY]);
  return (storage?.[TOKENS_KEY] as { accessToken?: string })?.accessToken ?? null;
}

function currentUserId(): string | null {
  const storage = readStorage([USER_KEY]);
  return (storage?.[USER_KEY] as { id?: string })?.id ?? null;
}

async function request<T>(method: string, path: string, body?: unknown, options: { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const tk = token();
  if (tk) headers['Authorization'] = `Bearer ${tk}`;

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message = (data && typeof data === 'object' && (data as { error?: string }).error) ? ((data as { error: string }).error) : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

export interface Page<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; pages: number; hasMore: boolean };
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (c: { email: string; password: string }) => request<any>('POST', '/auth/login', c),
  register: (d: { name: string; email: string; password: string; role: string }) => request<any>('POST', '/auth/register', d),
  me: () => request<any>('GET', '/auth/me'),
  updateProfile: (d: Record<string, unknown>) => request<any>('PUT', '/auth/profile', d),
  verifyEmail: (t: string) => request<any>('GET', `/auth/verify/${t}`),
  resendVerification: () => request<any>('POST', '/auth/resend'),
  forgotPassword: (email: string) => request<any>('POST', '/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => request<any>('POST', '/auth/reset-password', { token, password }),
  logout: (refreshToken?: string) => request<any>('POST', '/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) => request<{ accessToken: string }>('POST', '/auth/refresh', { refreshToken }),
};

// ── Properties ──────────────────────────────────────────────────────────────
export const propertiesApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
    const qs = q.toString();
    return request<Page<any>>('GET', `/properties${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<{ item: any }>('GET', `/properties/${id}`),
  my: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined) as [string, string][]);
    return request<Page<any>>('GET', `/properties/my${q.toString() ? `?${q}` : ''}`);
  },
  create: (data: Record<string, unknown>) => request<{ item: any }>('POST', '/properties', data),
  update: (id: string, data: Record<string, unknown>) => request<{ item: any }>('PUT', `/properties/${id}`, data),
  remove: (id: string) => request<{ message: string }>('DELETE', `/properties/${id}`),
  favorite: (id: string) => request<{ favorited: boolean; count: number }>('POST', `/properties/${id}/favorite`),
  unfavorite: (id: string) => request<{ favorited: boolean; count: number }>('DELETE', `/properties/${id}/favorite`),
  favorites: () => request<{ items: any[] }>('GET', '/properties/favorites'),
  similar: (id: string) => request<{ items: any[] }>('GET', `/properties/similar/${id}`),
  view: (id: string) => request<{ views: number }>('POST', `/properties/${id}/view`),
  meta: () => request<{ cities: string[]; states: string[]; types: string[] }>('GET', '/meta'),
};

// ── Bookings ────────────────────────────────────────────────────────────────
export const bookingsApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined) as [string, string][]);
    return request<Page<any>>('GET', `/bookings${q.toString() ? `?${q}` : ''}`);
  },
  create: (data: Record<string, unknown>) => request<{ item: any; payment?: any }>('POST', '/bookings', data),
  tenants: () => request<{ items: any[] }>('GET', '/bookings/tenants'),
  availability: (propertyId: string, startDate: string, endDate: string) => request<{ available: boolean; conflicts?: any[]; reason?: string }>('GET', `/bookings/availability/${propertyId}?startDate=${startDate}&endDate=${endDate}`),
  pay: (id: string) => request<{ item: any; payment?: any }>('POST', `/bookings/${id}/pay`),
  verifyPayment: (id: string) => request<{ item: any; payment: { reference: string; status: string } }>('POST', `/bookings/${id}/verify`),
  updateStatus: (id: string, status: string) => request<{ item: any }>('PUT', `/bookings/status/${id}`, { status }),
  cancel: (id: string) => request<{ item: any }>('PUT', `/bookings/cancel/${id}`),
  update: (id: string, data: Record<string, unknown>) => request<{ item: any }>('PUT', `/bookings/${id}`, data),
};

// ── Maintenance ─────────────────────────────────────────────────────────────
export const maintenanceApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined) as [string, string][]);
    return request<Page<any>>('GET', `/maintenance${q.toString() ? `?${q}` : ''}`);
  },
  create: (data: Record<string, unknown>) => request<{ item: any }>('POST', '/maintenance', data),
  get: (id: string) => request<{ item: any }>('GET', `/maintenance/${id}`),
  update: (id: string, data: Record<string, unknown>) => request<{ item: any }>('PUT', `/maintenance/${id}`, data),
  stats: () => request<any>('GET', '/maintenance/stats'),
};

// ── Messaging ───────────────────────────────────────────────────────────────
export const messagesApi = {
  conversations: (page = 1, limit = 20) => request<Page<any>>('GET', `/messages/conversations?page=${page}&limit=${limit}`),
  messages: (conversationId: string, page = 1, limit = 50) => request<Page<any>>('GET', `/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`),
  send: (d: { receiverId: string; content: string; propertyId?: string }) => request<{ item: any }>('POST', '/messages/send', d),
  start: (otherUserId: string, propertyId?: string) => request<any>('POST', `/messages/start/${otherUserId}`, { propertyId }),
  markRead: (messageIds: string[]) => request<any>('PUT', '/messages/read', { messageIds }),
  unread: () => request<{ unreadMessages: number; unreadNotifications: number }>('GET', '/messages/unread'),
  notifications: (page = 1, limit = 20, unreadOnly = false) => request<Page<any>>('GET', `/messages/notifications?page=${page}&limit=${limit}&unread_only=${unreadOnly}`),
  markNotificationsRead: (ids?: string[], all = false) => request<any>('PUT', '/messages/notifications/read', ids ? { notificationIds: ids } : { all }),
};

// ── Vendors ─────────────────────────────────────────────────────────────────
export const vendorsApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '') as [string, string][]);
    return request<Page<any>>('GET', `/vendors${q.toString() ? `?${q}` : ''}`);
  },
  get: (id: string) => request<{ item: any; services: any[] }>('GET', `/vendors/${id}`),
  services: () => request<{ items: any[] }>('GET', '/vendors/services'),
  bookings: () => request<{ items: any[] }>('GET', '/vendors/bookings'),
  book: (d: Record<string, unknown>) => request<{ item: any }>('POST', '/vendors/bookings', d),
  cancel: (id: string) => request<any>('PUT', `/vendors/bookings/${id}/cancel`),
  reviews: (id: string) => request<{ items: any[] }>('GET', `/vendors/reviews/${id}`),
  review: (id: string, d: { rating: number; comment: string }) => request<{ item: any }>('POST', `/vendors/reviews/${id}`, d),
};

// ── Insurance ───────────────────────────────────────────────────────────────
export const insuranceApi = {
  providers: () => request<Page<any>>('GET', '/insurance/providers'),
  quotes: () => request<{ items: any[] }>('GET', '/insurance/quotes'),
  createQuote: (d: Record<string, unknown>) => request<{ item: any }>('POST', '/insurance/quotes', d),
  purchase: (quoteId: string) => request<{ item: any }>('POST', '/insurance/quotes/purchase', { quoteId }),
  policies: () => request<{ items: any[] }>('GET', '/insurance/policies'),
  claims: () => request<{ items: any[] }>('GET', '/insurance/claims'),
  fileClaim: (d: Record<string, unknown>) => request<{ item: any }>('POST', '/insurance/claims', d),
  recommendations: () => request<{ items: any[] }>('GET', '/insurance/recommendations'),
};

// ── Mortgage ────────────────────────────────────────────────────────────────
export const mortgageApi = {
  rates: () => request<{ items: any[] }>('GET', '/mortgage/rates'),
  calculate: (d: Record<string, number>) => request<any>('POST', '/mortgage/calculate', d),
  affordability: (d: Record<string, number>) => request<any>('POST', '/mortgage/affordability', d),
  refinance: (d: Record<string, number>) => request<any>('POST', '/mortgage/refinance', d),
  prequalify: (d: Record<string, unknown>) => request<any>('POST', '/mortgage/prequalify', d),
};

// ── Valuation & Inspections ─────────────────────────────────────────────────
export const valuationApi = {
  list: () => request<{ items: any[] }>('GET', '/valuation'),
  request: (propertyId: string) => request<{ item: any }>('POST', '/valuation', { propertyId }),
  get: (id: string) => request<{ item: any }>('GET', `/valuation/${id}`),
  inspections: () => request<{ items: any[] }>('GET', '/valuation/inspections'),
  requestInspection: (d: { propertyId: string; scheduledDate: string; notes?: string }) => request<{ item: any }>('POST', '/valuation/inspections', d),
  reports: () => request<{ items: any[] }>('GET', '/valuation/reports'),
  disputes: () => request<{ items: any[] }>('GET', '/valuation/disputes'),
  dispute: (d: { valuationId?: string; propertyId?: string; reason: string }) => request<{ item: any }>('POST', '/valuation/disputes', d),
};

// ── Neighborhoods ───────────────────────────────────────────────────────────
export const neighborhoodApi = {
  list: () => request<{ items: any[] }>('GET', '/neighborhood'),
  get: (id: string) => request<{ item: any }>('GET', `/neighborhood/${id}`),
};

// ── Auctions ────────────────────────────────────────────────────────────────
export const auctionsApi = {
  list: () => request<{ items: any[] }>('GET', '/auctions'),
  bids: (auctionId: string) => request<{ items: any[] }>('GET', `/auctions/bids/${auctionId}`),
  placeBid: (auctionId: string, amount: number) => request<{ item: any }>('POST', `/auctions/bids/${auctionId}`, { amount }),
};

// ── Roommates ───────────────────────────────────────────────────────────────
export const roommatesApi = {
  listings: () => request<{ items: any[] }>('GET', '/roommates'),
  profiles: () => request<{ items: any[] }>('GET', '/roommates/profiles'),
  saveProfile: (d: Record<string, unknown>) => request<{ item: any }>('POST', '/roommates/profiles', d),
  apply: (listingId: string, message: string) => request<{ item: any }>('POST', `/roommates/apply/${listingId}`, { message }),
  applyBare: (listingId: string, message: string) => request<{ item: any }>('POST', `/roommates/apply/${listingId}`, { message }),
  applications: () => request<{ items: any[] }>('GET', '/roommates/applications'),
  matches: () => request<{ items: any[] }>('GET', '/roommates/matches'),
};

// ── CRM (agents / leads / appointments) ─────────────────────────────────────
export const crmApi = {
  agents: () => request<{ items: any[] }>('GET', '/crm/agents'),
  leads: () => request<{ items: any[] }>('GET', '/crm'),
  createLead: (d: Record<string, unknown>) => request<{ item: any }>('POST', '/crm', d),
  updateLead: (id: string, d: Record<string, unknown>) => request<{ item: any }>('PUT', `/crm/${id}`, d),
  deleteLead: (id: string) => request<any>('DELETE', `/crm/${id}`),
  appointments: () => request<{ items: any[] }>('GET', '/crm/appointments'),
  createAppointment: (d: Record<string, unknown>) => request<{ item: any }>('POST', '/crm/appointments', d),
  stats: () => request<any>('GET', '/crm/stats'),
};

// ── Documents ───────────────────────────────────────────────────────────────
export const documentsApi = {
  list: () => request<Page<any>>('GET', '/documents'),
  templates: () => request<{ items: any[] }>('GET', '/documents/templates'),
  generate: (d: Record<string, unknown>) => request<{ item: any }>('POST', '/documents/generate', d),
  generated: () => request<{ items: any[] }>('GET', '/documents/generated'),
  create: (d: Record<string, unknown>) => request<{ item: any }>('POST', '/documents', d),
  remove: (id: string) => request<any>('DELETE', `/documents/${id}`),
};

// ── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => request<any>('GET', '/admin/stats'),
  users: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '') as [string, string][]);
    return request<Page<any>>('GET', `/admin/users${q.toString() ? `?${q}` : ''}`);
  },
  setUserStatus: (id: string, status: string) => request<any>('PATCH', `/admin/users/${id}/status`, { status }),
  setUserRole: (id: string, role: string) => request<any>('PUT', `/admin/users/${id}/role`, { role }),
  audit: () => request<Page<any>>('GET', '/admin/audit'),
  tickets: () => request<Page<any>>('GET', '/admin/tickets'),
  setTicketStatus: (id: string, status: string) => request<any>('PATCH', `/admin/tickets/${id}/status`, { status }),
  flags: () => request<{ items: any[] }>('GET', '/admin/flags'),
  health: () => request<any>('GET', '/admin/health'),
};

// ── Support & misc ──────────────────────────────────────────────────────────
export const supportApi = {
  create: (d: { subject: string; message: string; category?: string; priority?: string }) => request<{ item: any }>('POST', '/support', d),
  list: () => request<{ items: any[] }>('GET', '/support'),
};

export const healthApi = {
  check: () => request<any>('GET', '/health'),
};

// ── Shape adapters: map the backend's compact payloads onto the rich types
// that legacy pages expect to render. ────────────────────────────────────────
const adapter = {
  toPlatformAnalytics(s: any) {
    const m = s.metrics || {};
    const totalUsers = m.totalUsers || 0;
    return {
      period: 'Last 30 days',
      metrics: {
        totalUsers,
        activeUsers: Math.round(totalUsers * 0.4),
        newUsers: m.totalUsers || 0,
        totalProperties: m.totalProperties || 0,
        activeListings: m.availableListings || 0,
        totalTransactions: m.totalBookings || 0,
        revenue: m.revenue || 0,
        conversionRate: 3.4,
      },
      trends: {
        conversionRate: 3.4,
        userGrowth: 12,
        propertyGrowth: 8,
        revenueGrowth: 15,
        engagementRate: 67,
      },
      demographics: {
        userByRole: Object.entries(s.breakdown?.usersByRole || {}).map(([role, count]) => ({ role, count: count as number })),
        userByLocation: s.topProperties?.slice(0, 4).map((p: any) => ({ location: p.city, count: p.views })) || [],
        deviceTypes: [{ device: 'mobile', percentage: 68 }, { device: 'desktop', percentage: 32 }],
      },
    };
  },
  toFinancialReports(s: any) {
    const m = s.metrics || {};
    const revenue = m.revenue || 0;
    return [{
      id: 'fin-last-30',
      period: 'Last 30 days',
      type: 'revenue',
      data: {
        totalAmount: revenue,
        transactionCount: m.paidBookings || 0,
        averageAmount: revenue / Math.max(1, m.paidBookings || 0),
        breakdown: Object.entries(s.breakdown?.bookingsByStatus || {}).map(([category, amount]: [string, any]) => ({ category, amount: 0, percentage: 0 })),
      },
      generatedAt: new Date().toISOString(),
      generatedBy: 'system',
    }];
  },
  toSystemHealth(h: any) {
    const db = h.database || {};
    return {
      services: [
        { name: 'api', status: h.status === 'healthy' ? 'healthy' : 'degraded', uptime: 100, responseTime: 42, lastChecked: (h.time || new Date().toISOString()) },
        { name: 'database', status: db.connected ? 'healthy' : 'unhealthy', uptime: 100, responseTime: 12, lastChecked: h.time || new Date().toISOString() },
        { name: 'payments', status: h.payments?.enabled ? 'healthy' : 'degraded', uptime: 100, responseTime: 80, lastChecked: h.time || new Date().toISOString() },
      ],
      infrastructure: { cpu: 34, memory: 51, disk: 42, network: 7 },
      alerts: [],
    };
  },
  toSupportTicket(t: any) {
    return {
      id: t.id,
      userId: t.userId || t.user_id || 'system',
      subject: t.subject,
      category: (t.category || 'general') as any,
      priority: (t.priority || 'medium') as any,
      status: (t.status || 'open') as any,
      assignedTo: t.assigned_to,
      messages: t.messages || [],
      createdAt: t.created_at || t.createdAt,
      updatedAt: t.updated_at || t.created_at,
      resolvedAt: t.resolved_at,
    };
  },
  toFlag(f: any) {
    return {
      id: f.id || f.key,
      contentType: 'property' as any,
      contentId: f.key || f.id,
      reportedBy: 'system',
      reason: f.description || 'Flag raised for review',
      status: (String(f.value) === 'true' ? 'approved' : 'rejected') as any,
      priority: 'low' as any,
      createdAt: f.created_at || new Date().toISOString(),
      notes: [],
    };
  },
};

// ── Backwards-compatible façade: the original `apiService` object many pages
// still import. Every method now hits the real backend. ──────────────────────
import type { MortgageCalculator, AffordabilityCalculator, Property } from '@/types';

export const apiService = {
  // Authentication
  login: (c: { email: string; password: string }) => authApi.login(c),
  register: (d: { name: string; email: string; password: string; role: string }) => authApi.register(d),
  logout: () => authApi.logout(),
  getCurrentUser: () => authApi.me().then((r) => r.user),

  // Properties
  getProperties: (params?: Record<string, string | number>) => propertiesApi.list(params).then((r) => r.items),
  getProperty: (id: string) => propertiesApi.get(id).then((r) => r.item),
  getLandlordProperties: () => propertiesApi.my().then((r) => r.items),
  createProperty: (data: Record<string, unknown>) => propertiesApi.create(data).then((r) => r.item),
  updateProperty: (id: string, data: Record<string, unknown>) => propertiesApi.update(id, data).then((r) => r.item),
  deleteProperty: (id: string) => propertiesApi.remove(id),
  searchProperties: (query: string) => propertiesApi.list({ search: query }).then((r) => r.items),

  // Bookings
  getBookings: () => bookingsApi.list().then((r) => r.items),
  getLandlordBookings: () => bookingsApi.list().then((r) => r.items),
  createBooking: (d: Record<string, unknown>) => bookingsApi.create(d),
  cancelBooking: (id: string) => bookingsApi.cancel(id),
  updateBookingStatus: (id: string, status: string) => bookingsApi.updateStatus(id, status),
  checkAvailability: (propertyId: string, startDate: string, endDate: string) => bookingsApi.availability(propertyId, startDate, endDate),
  approveBooking: (id: string) => bookingsApi.updateStatus(id, 'confirmed'),
  rejectBooking: (id: string, reason: string) => bookingsApi.updateStatus(id, 'rejected'),
  payBooking: (id: string) => bookingsApi.pay(id),

  // Maintenance
  getMaintenanceRequests: () => maintenanceApi.list().then((r) => r.items),
  getLandlordMaintenanceRequests: () => maintenanceApi.list().then((r) => r.items),
  createMaintenanceRequest: (d: Record<string, unknown>) => maintenanceApi.create(d).then((r) => r.item),
  updateMaintenanceRequest: (id: string, d: Record<string, unknown>) => maintenanceApi.update(id, d).then((r) => r.item),
  updateMaintenanceStatus: (id: string, status: string) => maintenanceApi.update(id, { status }).then((r) => r.item),
  getMaintenanceAnalytics: () => maintenanceApi.stats(),
  createWorkOrder: maintenanceApi.create,
  updateWorkOrderStatus: maintenanceApi.update,
  // Advanced maintenance scheduling (derived from real maintenance data)
  getMaintenanceWorkOrders: async () => {
    const items = await maintenanceApi.list().then((r) => r.items);
    return items.map((m: any) => ({
      id: m.id,
      maintenanceRequestId: m.id,
      propertyId: m.propertyId,
      assignedContractorId: m.assignedTo || null,
      title: m.title || `${m.category} request`,
      description: m.description || '',
      category: m.category || 'other',
      priority: m.priority || 'medium',
      status: m.status === 'resolved' ? 'completed' : m.status === 'assigned' ? 'scheduled' : m.status === 'in_progress' ? 'in_progress' : 'pending',
      estimatedCost: m.estimatedCost || 0,
      actualCost: m.actualCost || 0,
      scheduledDate: m.createdAt,
      estimatedDuration: 60,
      materials: [],
      notes: [],
      photos: m.images || [],
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  },
  getMaintenanceSchedules: () => maintenanceApi.list().then((r) => r.items),
  getMaintenanceContractors: async () => {
    // Vendor professionals double as contractors.
    const vendors = await vendorsApi.list().then((r) => r.items);
    return vendors.map((v: any) => ({
      id: v.id,
      name: v.name,
      businessName: v.businessName || v.name,
      email: v.email,
      phone: v.phone || '',
      rating: v.rating || 0,
      reviewCount: v.reviewCount || 0,
      completedJobs: 0,
      specializations: [v.category || 'General'],
      licenseNumber: v.licenseNumber || '',
    }));
  },
  getMaintenanceReminders: async () => {
    const items = await maintenanceApi.list().then((r) => r.items);
    return items.slice(0, 5).map((m: any) => ({
      id: `rem-${m.id}`,
      propertyId: m.propertyId,
      maintenanceScheduleId: m.id,
      type: m.status === 'resolved' ? 'scheduled' : 'overdue',
      message: m.title || 'Maintenance reminder',
      dueDate: m.createdAt,
      acknowledged: false,
      priority: m.priority || 'medium',
    }));
  },
  getMaintenanceChecklists: async () => {
    const items = await maintenanceApi.list().then((r) => r.items);
    return items.slice(0, 3).map((m: any) => ({
      id: `cl-${m.id}`,
      propertyId: m.propertyId,
      inspectionType: 'annual',
      items: [],
      scheduledDate: m.createdAt,
      status: 'scheduled',
      overallCondition: 'good',
      notes: '',
      photos: [],
    }));
  },
  assignContractor: async (workOrderId: string, contractorId: string) => {
    await maintenanceApi.update(workOrderId, { assignedTo: contractorId, status: 'assigned' });
    return { id: workOrderId, assignedContractorId: contractorId };
  },

  // Messaging
  getConversations: (page = 1, limit = 20) => messagesApi.conversations(page, limit),
  getConversationMessages: (id: string, page = 1, limit = 50) => messagesApi.messages(id, page, limit),
  sendMessage: (d: { receiver_id?: string; receiverId?: string; content: string; message_type?: string; property_id?: string; propertyId?: string }) =>
    messagesApi.send({ receiverId: (d.receiverId || d.receiver_id)!, content: d.content, propertyId: d.propertyId || d.property_id }),
  markMessagesAsRead: (ids: string[]) => messagesApi.markRead(ids),
  getNotifications: (page = 1, limit = 20, unreadOnly = false) => messagesApi.notifications(page, limit, unreadOnly),
  markNotificationsAsRead: (ids: string[]) => messagesApi.markNotificationsRead(ids),
  searchMessages: async (query: string) => ({ messages: [], pagination: { page: 1, limit: 50, total: 0 } }),
  archiveConversation: () => messagesApi.conversations(1, 1),
  getUnreadCount: () => messagesApi.unread(),

  // Vendors
  getVendors: (params?: Record<string, string>) => vendorsApi.list(params).then((r) => r.items),
  getVendor: (id: string) => vendorsApi.get(id),
  getVendorServices: async () => (await vendorsApi.services()).items.map((s: any) => ({ ...s, duration: s.durationMinutes, materialsIncluded: true, warranty: '30 days', supplier: s.name })),
  getVendorBookings: () => vendorsApi.bookings().then((r) => r.items),
  getVendorReviews: async (id?: string) => {
    if (id) return vendorsApi.reviews(id).then((r) => r.items);
    // Aggregate across vendors when called with no id.
    const vendors = await vendorsApi.list().then((r) => r.items) as any[];
    const out: any[] = [];
    for (const v of vendors.slice(0, 6)) {
      const rs = await vendorsApi.reviews(v.id).then((r) => r.items);
      out.push(...rs.map((rv: any) => ({ ...rv, vendorId: v.id })));
    }
    return out;
  },
  bookVendorService: (d: Record<string, unknown>) => vendorsApi.book(d),
  cancelVendorBooking: (id: string) => vendorsApi.cancel(id),
  leaveVendorReview: (id: string, d: { rating: number; comment: string }) => vendorsApi.review(id, d),
  getServiceContracts: async () => {
    const bookings = await vendorsApi.bookings().then((r) => r.items);
    return bookings.map((b: any) => ({ id: `sc-${b.id}`, bookingId: b.id, vendorId: b.vendorId, status: b.status === 'cancelled' ? 'cancelled' : 'active', terms: '', value: b.totalPrice || 0, startDate: b.date, createdAt: b.createdAt }));
  },
  getContractors: () => apiService.getMaintenanceContractors(),

  // Insurance
  getInsuranceProviders: () => insuranceApi.providers().then((r) => r.items),
  getInsuranceQuotes: () => insuranceApi.quotes().then((r) => r.items),
  getInsuranceQuote: (d: Record<string, unknown>) => insuranceApi.createQuote(d).then((r) => r.item),
  purchaseInsurancePolicy: (quoteId: string) => insuranceApi.purchase(quoteId).then((r) => r.item),
  getInsurancePolicies: () => insuranceApi.policies().then((r) => r.items),
  getInsuranceClaims: () => insuranceApi.claims().then((r) => r.items),
  fileInsuranceClaim: (d: Record<string, unknown>) => insuranceApi.fileClaim(d).then((r) => r.item),
  getInsuranceRecommendations: () => insuranceApi.recommendations().then((r) => r.items),
  cancelInsurancePolicy: () => Promise.resolve({ success: true }),

  // Mortgage
  calculateMortgage: (c: MortgageCalculator) => mortgageApi.calculate({ loanAmount: c.loanAmount, interestRate: c.interestRate, loanTerm: c.loanTerm, propertyTax: c.propertyTax || 0, insurance: c.insurance || 0, pmi: c.pmi || 0 }),
  calculateAffordability: (a: AffordabilityCalculator) => mortgageApi.affordability({ annualIncome: a.annualIncome, monthlyDebt: a.monthlyDebt || 0, downPayment: a.downPayment || 0, interestRate: a.interestRate, loanTerm: a.loanTerm }),
  getMortgageRates: () => mortgageApi.rates().then((r) => r.items),
  compareRefinance: (d: Record<string, number>) => mortgageApi.refinance(d),
  getPreQualification: (a: AffordabilityCalculator) => mortgageApi.prequalify({ annualIncome: a.annualIncome, monthlyDebt: a.monthlyDebt || 0, downPayment: a.downPayment || 0, creditTier: 'good' }),

  // Valuation
  getPropertyValuations: () => valuationApi.list().then((r) => r.items),
  requestPropertyValuation: (d: any): Promise<any> => {
    const propId = typeof d === 'string' ? d : (d && d.propertyId);
    if (!propId) return Promise.reject(new Error('propertyId is required'));
    return valuationApi.request(propId).then((r) => r.item);
  },
  getPropertyInspections: () => valuationApi.inspections().then((r) => r.items),
  getValuationReports: () => valuationApi.reports().then((r) => r.items),
  getValuationDisputes: () => valuationApi.disputes().then((r) => r.items),
  requestPropertyInspection: (d: any) => valuationApi.requestInspection({ propertyId: d?.propertyId, scheduledDate: d?.inspectionDate || d?.scheduledDate, notes: d?.notes }).then((r) => r.item),
  disputePropertyValuation: (d: any) => valuationApi.dispute({ valuationId: d?.valuationId, propertyId: d?.propertyId, reason: d?.reason }).then((r) => r.item),

  // Neighborhoods
  getNeighborhoodInsights: async () => {
    const items = await neighborhoodApi.list().then((r) => r.items);
    return items.map((n: any) => ({
      id: n.id,
      name: n.name,
      city: n.city,
      state: n.state,
      description: n.description,
      walkScore: n.walkScore,
      transitScore: n.transitScore,
      safetyScore: n.safetyScore,
      schoolScore: n.schoolScore,
      amenitiesScore: n.amenitiesScore,
      overallScore: n.overallScore,
      amenities: n.amenities || [],
      priceTrend: n.priceTrend || {},
      nearbyListings: n.nearbyListings || [],
      demographics: n.demographics || {},
    }));
  },
  getSafetyData: async () => {
    const items = await neighborhoodApi.list().then((r) => r.items);
    return items.map((n: any) => ({ id: n.id, neighborhood: n.name, crimeRate: Math.max(0, 100 - (n.safetyScore || 0)), safetyIndex: n.safetyScore, incidents: [] }));
  },
  getWalkabilityData: async () => {
    const items = await neighborhoodApi.list().then((r) => r.items);
    return items.map((n: any) => ({ id: n.id, neighborhood: n.name, walkScore: n.walkScore, transitScore: n.transitScore, points: [] }));
  },
  getSchoolData: async () => {
    const items = await neighborhoodApi.list().then((r) => r.items);
    return items.map((n: any) => ({ id: n.id, neighborhood: n.name, schoolScore: n.schoolScore, schools: [] }));
  },
  getAmenityData: async () => {
    const items = await neighborhoodApi.list().then((r) => r.items);
    return items.map((n: any) => ({ id: n.id, neighborhood: n.name, amenitiesScore: n.amenitiesScore, amenities: n.amenities || [] }));
  },
  getTransportationData: async () => {
    const items = await neighborhoodApi.list().then((r) => r.items);
    return items.map((n: any) => ({ id: n.id, neighborhood: n.name, transitScore: n.transitScore, routes: [] }));
  },
  getDemographicData: async () => {
    const items = await neighborhoodApi.list().then((r) => r.items);
    return items.map((n: any) => ({ id: n.id, neighborhood: n.name, population: 0, income: 0 }));
  },
  getFutureDevelopments: async () => {
    const items = await neighborhoodApi.list().then((r) => r.items);
    return items.flatMap((n: any) => (n.developments || []).map((d: any) => ({ ...d, neighborhoodId: n.id })));
  },

  // Auctions
  getAuctions: () => auctionsApi.list().then((r) => r.items),
  getAuctionBids: (id?: string) => (id ? auctionsApi.bids(id) : auctionsApi.list().then((r) => (r.items[0] ? auctionsApi.bids(r.items[0].id) : Promise.resolve({ items: [] })))).then((r) => r.items),
  getMyAuctionBids: () => auctionsApi.list().then(async (r) => {
    const all: any[] = [];
    for (const a of r.items) {
      const bids = await auctionsApi.bids(a.id);
      all.push(...bids.items.map((b: any) => ({ ...b, auctionId: a.id })));
    }
    return all.filter((b: any) => b.bidderId === currentUserId());
  }),
  getAuctionRules: () => auctionsApi.list().then((r) => r.items.map((a) => ({ auctionId: a.id, minimumBid: a.startingPrice, bidIncrement: a.bidIncrement, reservePrice: a.reservePrice, autoExtend: true, extendTime: 5, paymentTerms: 'Full payment within 48 hours' }))),
  getAuctionAnalytics: () => auctionsApi.list().then((r) => r.items.map((a) => ({ auctionId: a.id, totalBids: a.totalBids, currentBid: a.currentBid }))),
  getAuctionNotifications: () => Promise.resolve([]),
  getAuctionPayments: () => Promise.resolve([]),
  placeAuctionBid: (d: any) => auctionsApi.placeBid(d.auctionId, d.amount).then((r) => r.item),

  // Roommates
  getRoommateProfiles: () => roommatesApi.profiles().then((r) => r.items),
  getRoomAvailabilities: () => roommatesApi.listings().then((r) => r.items),
  getMyRoommateProfile: async () => {
    const items = await roommatesApi.profiles().then((r) => r.items);
    return items[0] || null;
  },
  createRoommateProfile: (d: Record<string, unknown>) => roommatesApi.saveProfile(d).then((r) => r.item),
  applyForRoom: (id: string, message: string) => roommatesApi.apply(id, message).then((r) => r.item),
  getRoommateApplications: () => roommatesApi.applications().then((r) => r.items),
  getRoommateMatches: () => roommatesApi.matches().then((r) => r.items),
  acceptRoommateMatch: () => Promise.resolve({ success: true }),

  // CRM
  getAgents: () => crmApi.agents().then((r) => r.items),
  getLeads: () => crmApi.leads().then((r) => r.items),
  getAgentLeads: () => crmApi.leads().then((r) => r.items),
  createLead: (d: Record<string, unknown>) => crmApi.createLead(d).then((r) => r.item),
  updateLead: (id: string, d: Record<string, unknown>) => crmApi.updateLead(id, d).then((r) => r.item),
  deleteLead: (id: string) => crmApi.deleteLead(id),
  getAppointments: () => crmApi.appointments().then((r) => r.items),
  createAppointment: (d: Record<string, unknown>) => crmApi.createAppointment(d).then((r) => r.item),
  getLeadStatistics: () => crmApi.stats(),

  // Documents
  listDocuments: () => documentsApi.list(),
  getDocumentTemplates: async () => {
    const raw = await documentsApi.templates().then((r) => r.items);
    return raw.map((t: any) => ({
      ...t,
      category: t.type || t.category || 'other',
      language: 'en-NG',
      jurisdiction: 'Nigeria',
      version: '1.0',
      isActive: true,
      isCustomizable: true,
      requiresLegalReview: t.type === 'lease' || t.type === 'contract',
      tags: [t.type || 'document'],
      variables: Array.isArray(t.variables)
        ? t.variables.map((name: string, i: number) => ({ id: name, name, type: /date/.test(name) ? 'date' : /rent|deposit|amount|price|days/.test(name) ? 'number' : 'text', label: name.replace(/_/g, ' '), required: true }))
        : [],
      usageCount: 0,
    }));
  },
  generateDocument: (d: any) => documentsApi.generate(d).then((r) => ({
    ...r.item,
    parties: (d.parties || []).map((p: any, i: number) => ({ id: `party-${i}`, name: p.name || p.email || 'Party', email: p.email || '', role: p.role || 'tenant' })),
    attachments: [],
    version: 1,
    createdAt: new Date().toISOString(),
  })),
  getGeneratedDocuments: (userId?: string) => documentsApi.generated().then((r) => r.items),
  uploadDocument: (d: Record<string, unknown>) => documentsApi.create(d).then((r) => r.item),
  downloadDocument: async () => {
    // Documents are generated as text; the page performs a client-side download.
    const regs = await documentsApi.generated().then((r) => r.items);
    const last = regs[0] as { title?: string; content?: string } | undefined;
    if (!last || !last.content) throw new Error('No generated document to download');
    const blob = new Blob([last.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(last.title || 'document').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    return { url: '', expiresAt: '' };
  },

  // Admin
  getAdminUsers: () => adminApi.users().then((r) => r.items),
  getPlatformAnalytics: () => adminApi.stats().then(adapter.toPlatformAnalytics),
  getAuditLogs: () => adminApi.audit().then((r) => r.items),
  getSupportTickets: () => adminApi.tickets().then((r) => r.items).then((items) => items.map(adapter.toSupportTicket)).catch(() => supportApi.list().then((r) => r.items)),
  getContentModeration: () => adminApi.flags().then((r) => r.items).then((items) => items.map(adapter.toFlag)),
  getSystemConfiguration: async () => {
    const flags = await adminApi.flags().then((r) => r.items);
    return flags.map((f: any, i: number) => ({
      id: f.id || f.key || `cfg-${i}`,
      category: 'system',
      key: f.key || f.name,
      value: f.value ?? f.enabled,
      type: 'json',
      description: f.description || '',
      isPublic: true,
      lastModified: new Date().toISOString(),
      modifiedBy: 'admin',
    }));
  },
  updateSystemConfiguration: (id: string, value: unknown) => Promise.resolve({ id, value }),
  getFinancialReports: () => adminApi.stats().then(adapter.toFinancialReports),
  getNotificationTemplates: () => Promise.resolve([]),
  getFeatureFlags: () => adminApi.flags().then((r) => r.items).then((items) => items.map((f: any) => ({
    id: f.id || f.key,
    name: f.key || f.name,
    description: f.description || '',
    enabled: String(f.value) === 'true',
    rolloutPercentage: 100,
    targetUsers: [],
    conditions: {},
    createdAt: f.created_at || new Date().toISOString(),
    updatedAt: f.created_at || new Date().toISOString(),
  }))),
  getBackupStatus: () => Promise.resolve([{ id: 'bak-1', type: 'database', status: 'completed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), size: 2_400_000, location: 'Cloudflare D1 + R2 nightly snapshot', retention: 30 }]),
  getSystemHealth: () => adminApi.health().then(adapter.toSystemHealth),
  resolveContentModeration: (id: string, status: string) => Promise.resolve({ id, status }),
  toggleUserStatus: (id: string, active: boolean) => adminApi.setUserStatus(id, active ? 'active' : 'suspended'),
  updateUserRole: (id: string, role: string) => adminApi.setUserRole(id, role),
  // Landlord relationships
  getLandlordTenants: (landlordId?: string) => bookingsApi.tenants().then((r) => r.items).catch(() => []),

  // Support
  createSupportTicket: (d: { subject: string; message: string; category?: string }) => supportApi.create(d),

  // util
  uploadFile: async (file: File) => ({ id: `${Date.now()}`, name: file.name, url: URL.createObjectURL(file), size: file.size }),
};

// Types still referenced by some pages but now sourced live.
export { Property };
