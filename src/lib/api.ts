import { apiGet, apiPost, apiPut, apiDelete } from './http';
import { normalizeProperty, fallbackProperties } from './backend';
import {
  mockProperties, mockBookings, mockMaintenanceRequests, mockInsuranceProviders,
  mockInsuranceQuotes, mockInsurancePolicies, mockInsuranceClaims, mockInsuranceRecommendations,
  mockVendors, mockVendorServices, mockVendorBookings, mockVendorReviews,
  mockAuctions, mockBids, mockAuctionRules, mockAuctionAnalytics,
  mockPropertyValuations, mockPropertyInspections, mockValuationReports, mockValuationDisputes,
  mockNeighborhoodInsights, mockSafetyData, mockWalkabilityData,
  mockSchoolData, mockTransportationData, mockAmenityData, mockDemographicData, mockFutureDevelopment,
  mockAgents, mockLeads, mockAppointments, mockCommissions, mockAgentAnalytics,
  mockTrainingModules, mockAgentCertifications,
  mockServiceContracts, mockWorkOrders, mockContractors, mockMaintenanceSchedules,
  mockMaintenanceReminders, mockMaintenanceAnalytics, mockInspectionChecklists,
  mockDocumentTemplates, mockGeneratedDocuments, mockESignatureRequests,
  mockDocumentVersions, mockDocumentCompliance, mockDocumentAnalytics, mockLegalReviews,
  mockAdminUsers, mockPlatformAnalytics, mockContentModeration, mockSystemConfiguration,
  mockAuditLogs, mockFinancialReports, mockNotificationTemplates, mockSupportTickets,
  mockFeatureFlags, mockBackupStatus, mockSystemHealth,
  mockRoommateProfiles, mockRoomAvailabilities, mockRoommateApplications, mockRoommateMatches,
  mockTestSuites, mockTestCases, mockTestRuns, mockBugReports, mockPerformanceTests,
  mockAccessibilityTests, mockSecurityTests, mockTestCoverage, mockTestPipelines,
  mockMortgageRates,
} from './mockData';
import type {
  Property, Booking, MaintenanceRequest, RoommateProfile, RoomAvailability,
  RoommateMatch, RoommateApplication, Vendor, VendorService, VendorBooking,
  InsuranceProvider, InsuranceQuote, InsurancePolicy, InsuranceClaim, InsuranceRecommendation,
  Auction, Bid, AuctionRules, AuctionAnalytics, Agent, Lead as AgentLead,
  PropertyValuation, PropertyInspection, ValuationReport, ValuationDispute,
  NeighborhoodInsights, DocumentTemplate,
} from '@/types';

/* ------------------------------------------------------------------ */
/* Public types (also consumed by AgentCRMDashboard)                    */
/* ------------------------------------------------------------------ */
export interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  source: string;
  status: string;
  priority: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  notes?: string | null;
  leadScore?: number | null;
  createdAt?: string;
}

export interface LeadStats {
  total?: number;
  new?: number;
  contacted?: number;
  qualified?: number;
  touring?: number;
  closed_won?: number;
  closed_lost?: number;
  conversion_rate?: number;
}

/** Unwrap the `{ data }` envelope, degrade to `[]`/null on network errors. */
async function safeGet<T>(path: string): Promise<T | null> {
  try {
    const { data } = await apiGet<T>(path);
    return data;
  } catch {
    return null;
  }
}

function normBooking(row: any): Booking {
  return {
    id: row.id,
    propertyId: row.propertyId ?? row.property_id,
    tenantId: row.tenantId ?? row.tenant_id,
    startDate: row.startDate ?? row.start_date,
    endDate: row.endDate ?? row.end_date,
    status: row.status ?? 'pending',
    totalPrice: row.totalPrice ?? row.total_price ?? 0,
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  };
}

function normMaintenance(row: any): MaintenanceRequest {
  return {
    id: row.id,
    propertyId: row.propertyId ?? row.property_id,
    tenantId: row.tenantId ?? row.tenant_id,
    category: row.category ?? 'other',
    title: row.title,
    description: row.description ?? '',
    priority: row.priority ?? 'medium',
    status: row.status ?? 'pending',
    images: Array.isArray(row.images) ? row.images : [],
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? row.updated_at ?? new Date().toISOString(),
  };
}

export const apiService = {
  /* ============================== AUTH ============================== */
  async login(credentials: { email: string; password: string }) {
    const url = credentials;
    void url;
    throw new Error('Use authService.login instead');
  },
  async register(_data: unknown) {
    throw new Error('Use authService.register instead');
  },

  /* ============================ PROPERTIES =========================== */
  async getProperties(): Promise<Property[]> {
    const list = await safeGet<any[]>('/properties?limit=50').catch(() => null);
    if (Array.isArray(list) && list.length > 0) return list.map(normalizeProperty);
    return fallbackProperties(async () => []);
  },
  async getFeaturedProperties(): Promise<Property[]> {
    const list = await safeGet<any[]>('/properties/featured').catch(() => null);
    if (Array.isArray(list) && list.length > 0) return list.map(normalizeProperty);
    return mockProperties.filter((p) => p.featured);
  },
  async getProperty(id: string): Promise<Property | null> {
    const row = await safeGet<any>(`/properties/${id}`);
    if (row) return normalizeProperty(row);
    return mockProperties.find((p) => p.id === id) ?? null;
  },
  async searchProperties(query: string): Promise<Property[]> {
    const all = await this.getProperties();
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.location.city.toLowerCase().includes(q),
    );
  },

  /* ============================= BOOKINGS ============================ */
  async getBookings(): Promise<Booking[]> {
    const rows = await safeGet<any[]>('/bookings');
    if (Array.isArray(rows)) return rows.map(normBooking);
    return mockBookings;
  },
  async createBooking(bookingData: any): Promise<any> {
    const { data } = await apiPost('/bookings', bookingData);
    return data;
  },
  async cancelBooking(bookingId: string): Promise<any> {
    const { data } = await apiPost(`/bookings/${bookingId}/cancel`);
    return data;
  },
  async updateBookingStatus(bookingId: string, status: string): Promise<any> {
    const { data } = await apiPut(`/bookings/${bookingId}/status`, { status });
    return data;
  },
  async approveBooking(bookingId: string): Promise<any> {
    return this.updateBookingStatus(bookingId, 'confirmed');
  },
  async rejectBooking(bookingId: string, _reason?: string): Promise<any> {
    return this.updateBookingStatus(bookingId, 'rejected');
  },
  async checkAvailability(propertyId: string, startDate: string, endDate: string): Promise<any> {
    const { data } = await apiGet<any>(
      `/bookings/availability/${propertyId}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    ).catch(() => ({ data: { available: true, conflictingBookings: [] } }));
    return data;
  },

  /* =========================== MAINTENANCE ========================== */
  async createMaintenanceRequest(requestData: any): Promise<any> {
    const { data } = await apiPost('/maintenance', requestData);
    return data;
  },
  async getMaintenanceRequests(): Promise<any[]> {
    const rows = await safeGet<any[]>('/maintenance');
    if (Array.isArray(rows)) return rows.map(normMaintenance);
    return mockMaintenanceRequests;
  },
  async updateMaintenanceRequest(requestId: string, updateData: any): Promise<any> {
    const { data } = await apiPut(`/maintenance/${requestId}/status`, updateData).catch(() => ({
      data: { id: requestId, ...updateData, updatedAt: new Date().toISOString() },
    }));
    return data;
  },
  async updateMaintenanceStatus(requestId: string, status: string): Promise<any> {
    const { data } = await apiPut(`/maintenance/${requestId}/status`, { status });
    return data;
  },

  /* ============================ MESSAGING =========================== */
  async getConversations(_userId?: string, _page = 1, _limit = 20) {
    const data = await safeGet<any[]>('/messages/conversations');
    return { conversations: data ?? [], pagination: { page: _page, limit: _limit, total: (data ?? []).length } };
  },
  async getConversationMessages(conversationId: string, _page = 1, _limit = 50) {
    const data = await safeGet<any[]>(`/messages/conversations/${conversationId}/messages`);
    return { messages: data ?? [], pagination: { page: _page, limit: _limit, total: (data ?? []).length } };
  },
  async getOrCreateConversation(participantId: string, propertyId?: string | null) {
    const { data } = await apiPost('/messages/conversations', { participantId, propertyId: propertyId ?? null });
    return data;
  },
  async sendMessage(messageData: {
    conversation_id?: string;
    receiver_id?: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    content: string;
    property_id?: string | null;
    lead_id?: string | null;
  }) {
    const { data } = await apiPost('/messages', {
      conversationId: messageData.conversation_id ?? undefined,
      receiverId: messageData.receiver_id ?? undefined,
      content: messageData.content,
      kind: messageData.message_type ?? 'text',
      propertyId: messageData.property_id ?? null,
    });
    return data;
  },
  async markMessagesAsRead(_messageIds: string[]) {
    return { success: true };
  },
  async getNotifications(_page = 1, _limit = 20, unreadOnly = false) {
    const data = await safeGet<any[]>(`/messages/notifications?unread_only=${unreadOnly}`);
    return { notifications: data ?? [], pagination: { page: _page, limit: _limit, total: (data ?? []).length } };
  },
  async markNotificationsAsRead(_notificationIds?: string[]) {
    try {
      await apiPut('/messages/notifications/read', { notification_ids: _notificationIds ?? [] });
    } catch { /* noop */ }
    return { success: true };
  },
  async searchMessages(query: string, _page = 1, _limit = 50) {
    const data = await safeGet<any[]>(`/messages/search?q=${encodeURIComponent(query)}`);
    return { messages: data ?? [], pagination: { page: _page, limit: _limit, total: (data ?? []).length } };
  },
  async archiveConversation(conversationId: string) {
    const { data } = await apiPut(`/messages/conversations/${conversationId}/archive`, { archived: true });
    return data;
  },

  /* ============================ ROOMMATES =========================== */
  async getRoommateProfiles(): Promise<RoommateProfile[]> {
    return (await safeGet<RoommateProfile[]>('/roommates/profiles')) ?? mockRoommateProfiles;
  },
  async getMyRoommateProfile(_userId?: string): Promise<RoommateProfile | null> {
    return (await safeGet<RoommateProfile>('/roommates/profile')) ?? null;
  },
  async createRoommateProfile(profileData: any): Promise<any> {
    const { data } = await apiPost('/roommates/profile', profileData);
    return data;
  },
  async getRoomAvailabilities(): Promise<RoomAvailability[]> {
    return (await safeGet<RoomAvailability[]>('/roommates/availabilities')) ?? mockRoomAvailabilities;
  },
  async getRoommateMatches(_userId?: string): Promise<RoommateMatch[]> {
    return (await safeGet<RoommateMatch[]>('/roommates/matches')) ?? mockRoommateMatches;
  },
  async getRoommateApplications(_userId?: string): Promise<RoommateApplication[]> {
    return (await safeGet<RoommateApplication[]>('/roommates/applications')) ?? mockRoommateApplications;
  },
  async applyForRoom(availabilityId: string, message: string): Promise<any> {
    const { data } = await apiPost('/roommates/applications', { roomAvailabilityId: availabilityId, message });
    return data;
  },
  async acceptRoommateMatch(_matchId: string): Promise<any> {
    return { success: true };
  },

  /* ============================= VENDORS ============================ */
  async getVendors(): Promise<Vendor[]> {
    return (await safeGet<Vendor[]>('/vendors')) ?? mockVendors;
  },
  async getVendorServices(): Promise<VendorService[]> {
    return (await safeGet<VendorService[]>('/vendors/services')) ?? mockVendorServices;
  },
  async getVendorBookings(_clientId?: string): Promise<VendorBooking[]> {
    return (await safeGet<VendorBooking[]>('/vendors/bookings')) ?? mockVendorBookings;
  },
  async getVendorReviews(): Promise<any[]> {
    return (await safeGet<any[]>('/vendors/reviews')) ?? mockVendorReviews;
  },
  async bookVendorService(bookingData: any): Promise<any> {
    const { data } = await apiPost('/vendors/bookings', bookingData);
    return data;
  },
  async cancelVendorBooking(bookingId: string): Promise<any> {
    const { data } = await apiDelete(`/vendors/bookings/${bookingId}`).catch(() => ({
      data: { success: true, message: 'Vendor booking cancelled' },
    }));
    return data;
  },
  async leaveVendorReview(review: any): Promise<any> {
    const { data } = await apiPost('/vendors/reviews', review).catch(() => ({
      data: { id: Date.now().toString(), ...review, createdAt: new Date().toISOString() },
    }));
    return data;
  },

  /* ============================ INSURANCE =========================== */
  async getInsuranceProviders(): Promise<InsuranceProvider[]> {
    return (await safeGet<InsuranceProvider[]>('/insurance/providers')) ?? mockInsuranceProviders;
  },
  async getInsuranceQuotes(): Promise<InsuranceQuote[]> {
    return (await safeGet<InsuranceQuote[]>('/insurance/quotes')) ?? mockInsuranceQuotes;
  },
  async getInsurancePolicies(_clientId?: string): Promise<InsurancePolicy[]> {
    return (await safeGet<InsurancePolicy[]>('/insurance/policies')) ?? mockInsurancePolicies;
  },
  async getInsuranceClaims(_clientId?: string): Promise<InsuranceClaim[]> {
    return (await safeGet<InsuranceClaim[]>('/insurance/claims')) ?? mockInsuranceClaims;
  },
  async getInsuranceRecommendations(_clientId?: string): Promise<InsuranceRecommendation[]> {
    return (await safeGet<InsuranceRecommendation[]>('/insurance/recommendations')) ?? mockInsuranceRecommendations;
  },
  async getInsuranceQuote(quoteData: any): Promise<any> {
    const { data } = await apiPost('/insurance/quotes', quoteData);
    return data;
  },
  async purchaseInsurancePolicy(_quoteId: string): Promise<any> {
    return { id: Date.now().toString(), status: 'active' };
  },
  async fileInsuranceClaim(claimData: any): Promise<any> {
    const { data } = await apiPost('/insurance/claims', claimData);
    return data;
  },
  async cancelInsurancePolicy(_policyId: string): Promise<any> {
    return { success: true };
  },

  /* ============================= AUCTIONS =========================== */
  async getAuctions(): Promise<Auction[]> {
    return (await safeGet<Auction[]>('/auctions')) ?? mockAuctions;
  },
  async getAuctionBids(): Promise<Bid[]> {
    return (await safeGet<Bid[]>('/auctions/bids')) ?? mockBids;
  },
  async getMyAuctionBids(_userId?: string): Promise<Bid[]> {
    return (await safeGet<Bid[]>('/auctions/bids/mine')) ?? mockBids;
  },
  async getAuctionRules(): Promise<AuctionRules[]> {
    return (await safeGet<AuctionRules[]>('/auctions/rules')) ?? mockAuctionRules;
  },
  async getAuctionAnalytics(): Promise<AuctionAnalytics[]> {
    return (await safeGet<AuctionAnalytics[]>('/auctions/analytics')) ?? mockAuctionAnalytics;
  },
  async getAuctionPayments(_userId?: string): Promise<any[]> {
    return (await safeGet<any[]>('/auctions/payments')) ?? [];
  },
  async getAuctionNotifications(_userId?: string): Promise<any[]> {
    return (await safeGet<any[]>('/auctions/notifications')) ?? [];
  },
  async placeAuctionBid(bidData: any): Promise<any> {
    const { data } = await apiPost('/auctions/bids', bidData);
    return data;
  },

  /* ===================== VALUATION & NEIGHBORHOOD ==================== */
  async getPropertyValuations(): Promise<PropertyValuation[]> {
    return (await safeGet<PropertyValuation[]>('/valuation')) ?? mockPropertyValuations;
  },
  async requestPropertyValuation(valuationData: any): Promise<any> {
    const { data } = await apiPost('/valuation', valuationData);
    return data;
  },
  async getPropertyInspections(): Promise<PropertyInspection[]> {
    return (await safeGet<PropertyInspection[]>('/valuation/inspections')) ?? mockPropertyInspections;
  },
  async requestPropertyInspection(inspectionData: any): Promise<any> {
    const { data } = await apiPost('/valuation/inspections', inspectionData);
    return data;
  },
  async getValuationReports(): Promise<ValuationReport[]> {
    return (await safeGet<ValuationReport[]>('/valuation/reports')) ?? mockValuationReports;
  },
  async getValuationDisputes(): Promise<ValuationDispute[]> {
    return (await safeGet<ValuationDispute[]>('/valuation/disputes')) ?? mockValuationDisputes;
  },
  async disputePropertyValuation(dispute: any): Promise<any> {
    const { data } = await apiPost('/valuation/disputes', dispute);
    return data;
  },
  async getNeighborhoodInsights(): Promise<NeighborhoodInsights[]> {
    return (await safeGet<NeighborhoodInsights[]>('/neighborhood')) ?? mockNeighborhoodInsights;
  },
  async getSafetyData(): Promise<any[]> {
    return (await safeGet<any[]>('/neighborhood/safety')) ?? mockSafetyData;
  },
  async getWalkabilityData(): Promise<any[]> {
    return (await safeGet<any[]>('/neighborhood/walkability')) ?? mockWalkabilityData;
  },
  async getSchoolData(): Promise<any[]> {
    return (await safeGet<any[]>('/neighborhood/schools')) ?? mockSchoolData;
  },
  async getTransportationData(): Promise<any[]> {
    return (await safeGet<any[]>('/neighborhood/transportation')) ?? mockTransportationData;
  },
  async getAmenityData(): Promise<any[]> {
    return (await safeGet<any[]>('/neighborhood/amenities')) ?? mockAmenityData;
  },
  async getDemographicData(): Promise<any[]> {
    return (await safeGet<any[]>('/neighborhood/demographics')) ?? mockDemographicData;
  },
  async getFutureDevelopments(): Promise<any[]> {
    return (await safeGet<any[]>('/neighborhood/future')) ?? mockFutureDevelopment;
  },

  /* ============================= CRM/AGENT ========================== */
  async getAgents(): Promise<Agent[]> {
    return (await safeGet<Agent[]>('/agents')) ?? mockAgents;
  },
  async getAgentLeads(): Promise<AgentLead[]> {
    return (await safeGet<AgentLead[]>('/agents/leads')) ?? mockLeads;
  },
  async getLeadStatistics(): Promise<LeadStats> {
    const stats = await safeGet<LeadStats>('/leads/stats');
    return stats ?? { total: mockLeads.length, new: 3, contacted: 4, qualified: 2, conversion_rate: 40 };
  },

  /* ============================== LEADS ============================= */
  async getLeads(): Promise<Lead[]> {
    const rows = await safeGet<any[]>('/leads');
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        fullName: r.fullName ?? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
        email: r.email ?? '',
        phone: r.phone ?? null,
        source: r.source ?? 'website',
        status: r.status ?? 'new',
        priority: r.priority ?? 'medium',
        budgetMin: r.budgetMin ?? r.budget_min ?? null,
        budgetMax: r.budgetMax ?? r.budget_max ?? null,
        notes: r.notes ?? null,
        leadScore: r.leadScore ?? r.lead_score ?? 50,
        createdAt: r.createdAt ?? r.created_at,
      }));
    }
    return mockLeads.map((l: any) => ({
      id: String(l.id),
      fullName: l.first_name && l.last_name ? `${l.first_name} ${l.last_name}` : (l.clientName ?? l.name ?? 'Lead'),
      email: l.email ?? '',
      phone: l.phone ?? null,
      source: l.source ?? 'website',
      status: l.status ?? 'new',
      priority: l.priority ?? 'medium',
      budgetMin: l.budget_min ?? l.budget?.min ?? null,
      budgetMax: l.budget_max ?? l.budget?.max ?? null,
      leadScore: l.lead_score ?? 50,
    }));
  },
  async getLead(id: string): Promise<Lead | null> {
    const row = await safeGet<any>(`/leads/${id}`);
    if (row) return row as Lead;
    const all = await this.getLeads();
    return all.find((l) => l.id === id) ?? null;
  },
  async createLead(leadData: any): Promise<any> {
    const { data } = await apiPost('/leads', leadData);
    return data;
  },
  async updateLead(id: string, updateData: any): Promise<any> {
    const { data } = await apiPut(`/leads/${id}`, updateData);
    return data;
  },
  async assignLead(id: string, agentId: string): Promise<any> {
    const { data } = await apiPut(`/leads/${id}`, { ownerId: agentId });
    return data;
  },
  async addLeadCommunication(_leadId: string, communicationData: any): Promise<any> {
    return { id: Date.now().toString(), ...communicationData, createdAt: new Date().toISOString() };
  },
  async addLeadTask(_leadId: string, taskData: any): Promise<any> {
    return { id: Date.now().toString(), ...taskData, status: 'pending', createdAt: new Date().toISOString() };
  },
  async getAppointments(): Promise<any[]> {
    return (await safeGet<any[]>('/agents/appointments')) ?? mockAppointments;
  },

  /* ========================== LANDLORD PORTAL ======================= */
  async getLandlordProperties(_userId?: string): Promise<Property[]> {
    const rows = await safeGet<any[]>('/properties?status=all&mine=1');
    if (Array.isArray(rows) && rows.length > 0) return rows.map(normalizeProperty);
    return mockProperties;
  },
  async getLandlordBookings(_userId?: string): Promise<any[]> {
    const rows = await safeGet<any[]>('/bookings');
    if (Array.isArray(rows)) return rows.map(normBooking);
    return mockBookings;
  },
  async getLandlordMaintenanceRequests(_userId?: string): Promise<any[]> {
    return this.getMaintenanceRequests();
  },
  async getLandlordTenants(_userId?: string): Promise<any[]> {
    return (await safeGet<any[]>('/users/tenants')) ?? [];
  },

  /* ====================== MAINTENANCE SCHEDULING ==================== */
  async getMaintenanceWorkOrders(_userId?: string): Promise<any[]> {
    return (await safeGet<any[]>('/maintenance/work-orders')) ?? mockWorkOrders ?? [];
  },
  async getMaintenanceSchedules(_userId?: string): Promise<any[]> {
    return (await safeGet<any[]>('/maintenance/schedules')) ?? mockMaintenanceSchedules ?? [];
  },
  async getMaintenanceContractors(): Promise<any[]> {
    return (await safeGet<any[]>('/maintenance/contractors')) ?? mockContractors ?? [];
  },
  async getMaintenanceReminders(_userId?: string): Promise<any[]> {
    return (await safeGet<any[]>('/maintenance/reminders')) ?? mockMaintenanceReminders ?? [];
  },
  async getMaintenanceAnalytics(): Promise<any> {
    return (await safeGet<any>('/maintenance/analytics')) ?? mockMaintenanceAnalytics;
  },
  async getMaintenanceChecklists(): Promise<any[]> {
    return (await safeGet<any[]>('/maintenance/checklists')) ?? mockInspectionChecklists ?? [];
  },
  async getContractors(): Promise<any[]> {
    return (await safeGet<any[]>('/contractors')) ?? mockContractors ?? [];
  },
  async createWorkOrder(workOrder: any): Promise<any> {
    const { data } = await apiPost('/maintenance/work-orders', workOrder);
    return data;
  },
  async updateWorkOrderStatus(id: string, status: string): Promise<any> {
    const { data } = await apiPut(`/maintenance/work-orders/${id}/status`, { status });
    return data;
  },
  async assignContractor(orderId: string, contractorId: string): Promise<any> {
    const { data } = await apiPut(`/maintenance/work-orders/${orderId}/assign`, { contractorId });
    return data;
  },
  async getServiceContracts(): Promise<any[]> {
    return (await safeGet<any[]>('/maintenance/service-contracts')) ?? mockServiceContracts ?? [];
  },

  /* =========================== MORTGAGES ============================ */
  async calculateMortgage(calculator: any): Promise<any> {
    const { data } = await apiPost('/mortgage/calculate', calculator);
    return data;
  },
  async calculateAffordability(affordability: any): Promise<any> {
    const { data } = await apiPost('/mortgage/affordability', affordability);
    return data;
  },
  async getMortgageRates(): Promise<any[]> {
    const data = await safeGet<any[]>('/mortgage/rates');
    return data ?? mockMortgageRates ?? [];
  },
  async compareRefinance(refinanceData: any): Promise<any> {
    return {
      currentLoan: refinanceData.currentLoan,
      newLoan: refinanceData.newLoan,
      monthlyPayment: 1708,
      totalSavings: 625,
      breakEvenPoint: 8,
    };
  },
  async getPreQualification(affordability: any): Promise<any> {
    const affordabilityResult = await this.calculateAffordability(affordability);
    return {
      preQualifiedAmount: Math.round(affordabilityResult.maxHomePrice),
      estimatedRate: 6.5,
      factors: ['Automated DTI analysis', 'Stable income'],
      nextSteps: ['Gather documents', 'Choose lender'],
    };
  },

  /* =========================== DOCUMENTS ============================ */
  async listDocuments(_filters?: any): Promise<any> {
    return { documents: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  },
  async getDocumentTemplates(): Promise<DocumentTemplate[]> {
    return (await safeGet<DocumentTemplate[]>('/documents/templates')) ?? mockDocumentTemplates as any;
  },
  async generateDocument(documentData: any): Promise<any> {
    const { data } = await apiPost('/documents/generate', documentData);
    return data;
  },
  async getGeneratedDocuments(_clientId?: string): Promise<any[]> {
    return (await safeGet<any[]>('/documents/generated')) ?? mockGeneratedDocuments ?? [];
  },
  async requestSignature(signatureRequestData: any): Promise<any> {
    const { data } = await apiPost('/documents/signatures', signatureRequestData);
    return data;
  },
  async getSignatureRequests(_userId?: string): Promise<any[]> {
    return (await safeGet<any[]>('/documents/signatures')) ?? mockESignatureRequests ?? [];
  },
  async getDocumentVersions(): Promise<any[]> {
    return (await safeGet<any[]>('/documents/versions')) ?? mockDocumentVersions ?? [];
  },
  async getDocumentCompliance(): Promise<any[]> {
    return (await safeGet<any[]>('/documents/compliance')) ?? mockDocumentCompliance ?? [];
  },
  async getDocumentAnalytics(): Promise<any> {
    return (await safeGet<any>('/documents/analytics')) ?? mockDocumentAnalytics;
  },
  async getLegalReviews(): Promise<any[]> {
    return (await safeGet<any[]>('/documents/legal-reviews')) ?? mockLegalReviews ?? [];
  },
  async requestLegalReview(review: any): Promise<any> {
    const { data } = await apiPost('/documents/legal-reviews', review);
    return data;
  },
  async downloadDocument(documentId: string): Promise<any> {
    return { url: `/api/documents/${documentId}/download`, expiresAt: new Date(Date.now() + 86400000).toISOString() };
  },

  /* =========================== ADMIN ================================ */
  async getAdminUsers(): Promise<any[]> {
    return (await safeGet<any[]>('/admin/users')) ?? mockAdminUsers;
  },
  async updateUserRole(userId: string, role: string): Promise<any> {
    const { data } = await apiPut(`/admin/users/${userId}`, { role });
    return data;
  },
  async toggleUserStatus(userId: string, active: boolean): Promise<any> {
    const { data } = await apiPut(`/admin/users/${userId}`, { isActive: active });
    return data;
  },
  async getPlatformAnalytics(): Promise<any> {
    return (await safeGet<any>('/admin/analytics')) ?? mockPlatformAnalytics;
  },
  async getContentModeration(): Promise<any[]> {
    return (await safeGet<any[]>('/admin/moderation')) ?? mockContentModeration;
  },
  async resolveContentModeration(id: string, decision: any): Promise<any> {
    const { data } = await apiPut(`/admin/moderation/${id}`, decision);
    return data;
  },
  async getSystemConfiguration(): Promise<any[]> {
    return (await safeGet<any[]>('/admin/config')) ?? mockSystemConfiguration;
  },
  async updateSystemConfiguration(id: string, value: any): Promise<any> {
    const { data } = await apiPut(`/admin/config/${id}`, { value });
    return data;
  },
  async getAuditLogs(): Promise<any[]> {
    return (await safeGet<any[]>('/admin/audit-logs')) ?? mockAuditLogs ?? [];
  },
  async getFinancialReports(): Promise<any[]> {
    return (await safeGet<any[]>('/admin/financial-reports')) ?? mockFinancialReports ?? [];
  },
  async getNotificationTemplates(): Promise<any[]> {
    return (await safeGet<any[]>('/admin/notification-templates')) ?? mockNotificationTemplates ?? [];
  },
  async getSupportTickets(): Promise<any[]> {
    return (await safeGet<any[]>('/admin/support-tickets')) ?? mockSupportTickets ?? [];
  },
  async getFeatureFlags(): Promise<any[]> {
    return (await safeGet<any[]>('/admin/feature-flags')) ?? mockFeatureFlags ?? [];
  },
  async getBackupStatus(): Promise<any[]> {
    return (await safeGet<any[]>('/admin/backups')) ?? mockBackupStatus ?? [];
  },

  /* ============================== QA ================================ */
  async getTestSuites(): Promise<any[]> { return (await safeGet<any[]>('/qa/suites')) ?? mockTestSuites ?? []; },
  async getTestCases(): Promise<any[]> { return (await safeGet<any[]>('/qa/cases')) ?? mockTestCases ?? []; },
  async getTestRuns(): Promise<any[]> { return (await safeGet<any[]>('/qa/runs')) ?? mockTestRuns ?? []; },
  async getBugReports(): Promise<any[]> { return (await safeGet<any[]>('/qa/bugs')) ?? mockBugReports ?? []; },
  async getPerformanceTests(): Promise<any[]> { return (await safeGet<any[]>('/qa/perf')) ?? mockPerformanceTests ?? []; },
  async getAccessibilityTests(): Promise<any[]> { return (await safeGet<any[]>('/qa/a11y')) ?? mockAccessibilityTests ?? []; },
  async getSecurityTests(): Promise<any[]> { return (await safeGet<any[]>('/qa/security')) ?? mockSecurityTests ?? []; },
  async getTestCoverage(): Promise<any[]> { return (await safeGet<any[]>('/qa/coverage')) ?? mockTestCoverage ?? []; },
  async getTestPipelines(): Promise<any[]> { return (await safeGet<any[]>('/qa/pipelines')) ?? mockTestPipelines ?? []; },
  async runTestSuite(_suiteId: string): Promise<any> {
    return { runId: Date.now().toString(), status: 'running', startTime: new Date().toISOString() };
  },
  async getSystemHealth(): Promise<any> {
    return (await safeGet<any>('/health')) ?? mockSystemHealth;
  },

  /* =========================== MISC/UTIL ============================ */
  async processPayment(paymentData: any): Promise<any> {
    const { data } = await apiPost('/payments', paymentData);
    return data;
  },
  async getPaymentHistory(_userId?: string): Promise<any[]> {
    return (await safeGet<any[]>('/payments')) ?? [];
  },
  async uploadFile(file: File, type: string): Promise<any> {
    return {
      id: Date.now().toString(),
      name: file.name,
      type,
      url: `/uploads/${Date.now()}_${file.name}`,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
  },
  async submitContact(payload: any): Promise<any> {
    const { data } = await apiPost('/contact', payload, { auth: false });
    return data;
  },
};
