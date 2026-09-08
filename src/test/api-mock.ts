import { vi } from 'vitest';

/**
 * Stubs the API module so page smoke tests can render without a server.
 *
 * Every endpoint resolves with an empty-but-well-shaped payload, which is
 * enough to prove a page renders its empty state instead of crashing.
 */
export const apiMocks = {
  propertiesApi: {
    list: vi.fn(async () => ({ data: [], pagination: { page: 1, per_page: 12, total: 0, total_pages: 1 } })),
    featured: vi.fn(async () => ({ data: [] })),
    get: vi.fn(async () => ({ data: null })),
    create: vi.fn(async () => ({ data: null })),
    update: vi.fn(async () => ({ data: null })),
    remove: vi.fn(async () => ({ success: true })),
    mine: vi.fn(async () => ({ data: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 1 } })),
  },
  bookingsApi: { list: vi.fn(async () => ({ data: [] })), create: vi.fn(), decide: vi.fn() },
  maintenanceApi: { list: vi.fn(async () => ({ data: [] })), create: vi.fn(), update: vi.fn() },
  messagesApi: {
    conversations: vi.fn(async () => ({ data: [] })),
    start: vi.fn(),
    messages: vi.fn(async () => ({ data: [] })),
    send: vi.fn(),
    markRead: vi.fn(async () => ({ success: true })),
  },
  documentsApi: { list: vi.fn(async () => ({ data: [] })), createUploadIntent: vi.fn(), complete: vi.fn(), download: vi.fn(), remove: vi.fn() },
  leadsApi: {
    list: vi.fn(async () => ({ data: [] })),
    statistics: vi.fn(async () => ({ data: { total_leads: 0, new_leads: 0, contacted_leads: 0, qualified_leads: 0, closed_won_leads: 0, closed_lost_leads: 0, conversion_rate: 0, avg_lead_score: 0, leads_this_month: 0, leads_this_week: 0 } })),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    showings: vi.fn(async () => ({ data: [] })),
    scheduleShowing: vi.fn(),
    updateShowingStatus: vi.fn(),
    commissions: vi.fn(async () => ({ data: [] })),
    updateCommissionStatus: vi.fn(),
  },
  vendorsApi: { list: vi.fn(async () => ({ data: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 1 } })), bookings: vi.fn(async () => ({ data: [] })), book: vi.fn(), review: vi.fn(), reviews: vi.fn(async () => ({ data: [] })) },
  roommatesApi: {
    profiles: vi.fn(async () => ({ data: [] })),
    matches: vi.fn(async () => ({ data: [] })),
    profile: vi.fn(async () => ({ data: null })),
    saveProfile: vi.fn(),
    apply: vi.fn(),
    applications: vi.fn(async () => ({ data: [] })),
    respond: vi.fn(),
  },
  notificationsApi: {
    list: vi.fn(async () => ({ data: [] })),
    unreadCount: vi.fn(async () => ({ data: { count: 0 } })),
    markRead: vi.fn(async () => ({ success: true })),
    markAllRead: vi.fn(async () => ({ success: true })),
  },
  adminApi: {
    analytics: vi.fn(async () => ({ data: { total_users: 0, total_properties: 0, total_bookings: 0, open_maintenance_requests: 0, new_users_last_30_days: 0, users_by_role: {}, bookings_by_status: {} } })),
    users: vi.fn(async () => ({ data: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 1 } })),
    setUserRole: vi.fn(),
    disableUser: vi.fn(),
  },
  profileApi: {
    get: vi.fn(async () => ({ data: { user: null } })),
    update: vi.fn(),
    changePassword: vi.fn(),
    summary: vi.fn(async () => ({ data: { active_bookings: [], open_maintenance: 0, unread_notifications: 0, my_properties: [] } })),
  },
  authApi: {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(async () => ({ success: true })),
    me: vi.fn(async () => ({ data: { user: null } })),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  },
  systemApi: { health: vi.fn(async () => ({ status: 'ok', version: 'v1' })) },
};

/** Registers the stub for every test in the file. */
export function mockApi() {
  vi.mock('@/lib/api', () => apiMocks);
}
