export type UserRole = 'tenant' | 'landlord' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  verified: boolean;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: 'apartment' | 'house' | 'condo' | 'studio' | 'townhouse';
  price: number;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: { lat: number; lng: number };
  };
  images: string[];
  bedrooms: number;
  bathrooms: number;
  area: number;
  amenities: string[];
  status: 'available' | 'occupied' | 'maintenance';
  landlordId: string;
  availableFrom: string;
  rules?: string;
  featured?: boolean;
}

export interface Booking {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalPrice: number;
  createdAt: string;
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  tenantId: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'pending' | 'in_progress' | 'resolved' | 'cancelled';
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface RoommateProfile {
  id: string;
  userId: string;
  age: number;
  occupation: string;
  preferences: {
    smoking: boolean;
    pets: boolean;
    nightOwl: boolean;
    cleanliness: 1 | 2 | 3 | 4 | 5;
    socialLevel: 1 | 2 | 3 | 4 | 5;
  };
  bio: string;
  budget: { min: number; max: number };
  lookingFor: string[];
  verified: boolean;
  backgroundCheck?: boolean;
  reviews: RoommateReview[];
}

export interface RoomAvailability {
  id: string;
  propertyId: string;
  landlordId: string;
  title: string;
  description: string;
  rent: number;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  images: string[];
  availableFrom: string;
  roommatesNeeded: number;
  currentRoommates: number;
  preferences: {
    gender?: 'male' | 'female' | 'any';
    ageRange: { min: number; max: number };
    smoking: boolean;
    pets: boolean;
  };
  amenities: string[];
}

export interface RoommateMatch {
  id: string;
  userId: string;
  roomAvailabilityId: string;
  compatibilityScore: number;
  matchedAt: string;
  status: 'pending' | 'interested' | 'applied' | 'rejected';
}

export interface RoommateApplication {
  id: string;
  userId: string;
  roomAvailabilityId: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt?: string;
}

export interface RoommateReview {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  description: string;
  services: string[];
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  rating: number;
  reviewCount: number;
  verified: boolean;
  licenseNumber?: string;
  insuranceExpiry?: string;
  avatar?: string;
  portfolio: string[];
  availability: {
    monday: { start: string; end: string };
    tuesday: { start: string; end: string };
    wednesday: { start: string; end: string };
    thursday: { start: string; end: string };
    friday: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday: { start: string; end: string };
  };
}

export interface VendorService {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  duration: number; // in minutes
  materialsIncluded: boolean;
  warranty: string;
}

export interface VendorBooking {
  id: string;
  vendorId: string;
  serviceId: string;
  clientId: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  totalPrice: number;
  createdAt: string;
}

export interface VendorReview {
  id: string;
  bookingId: string;
  clientId: string;
  vendorId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ServiceContract {
  id: string;
  bookingId: string;
  vendorId: string;
  clientId: string;
  terms: string;
  signedByVendor: boolean;
  signedByClient: boolean;
  signedAt?: string;
}

export interface InsuranceProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  website: string;
  phone: string;
  email: string;
  coverageTypes: string[];
  rating: number;
  reviewCount: number;
}

export interface InsuranceQuote {
  id: string;
  providerId: string;
  propertyId: string;
  clientId: string;
  coverageType: string;
  coverageAmount: number;
  premium: number;
  deductible: number;
  term: number; // in months
  createdAt: string;
  validUntil: string;
}

export interface InsurancePolicy {
  id: string;
  quoteId: string;
  providerId: string;
  propertyId: string;
  clientId: string;
  policyNumber: string;
  coverageType: string;
  coverageAmount: number;
  premium: number;
  deductible: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  documents: string[];
}

export interface InsuranceClaim {
  id: string;
  policyId: string;
  clientId: string;
  claimType: string;
  description: string;
  incidentDate: string;
  reportedDate: string;
  status: 'pending' | 'under_review' | 'approved' | 'denied' | 'paid';
  claimAmount: number;
  approvedAmount?: number;
  documents: string[];
  notes: string;
}

export interface InsuranceRecommendation {
  id: string;
  propertyId: string;
  clientId: string;
  recommendedCoverage: number;
  recommendedDeductible: number;
  riskFactors: string[];
  suggestedProviders: string[];
  createdAt: string;
}

export interface MortgageCalculator {
  loanAmount: number;
  interestRate: number;
  loanTerm: number; // in years
  downPayment: number;
  propertyTax: number;
  insurance: number;
  pmi?: number;
}

export interface AmortizationPayment {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface MortgageResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  amortizationSchedule: AmortizationPayment[];
}

export interface AffordabilityCalculator {
  annualIncome: number;
  monthlyDebt: number;
  downPayment: number;
  interestRate: number;
  loanTerm: number;
  propertyTaxRate: number;
  insuranceRate: number;
}

export interface AffordabilityResult {
  maxLoanAmount: number;
  maxHomePrice: number;
  monthlyPayment: number;
  debtToIncomeRatio: number;
}

export interface MortgageRate {
  lender: string;
  rate: number;
  apr: number;
  points: number;
  fees: number;
  term: number;
  lastUpdated: string;
}

export interface RefinanceComparison {
  currentLoan: {
    balance: number;
    rate: number;
    monthlyPayment: number;
    remainingTerm: number;
  };
  newLoan: {
    rate: number;
    term: number;
    closingCosts: number;
    monthlyPayment: number;
    totalSavings: number;
    breakEvenPoint: number;
  };
}

export interface PreQualificationResult {
  preQualifiedAmount: number;
  estimatedRate: number;
  factors: string[];
  nextSteps: string[];
}

export interface PropertyValuation {
  id: string;
  propertyId: string;
  avmValue: number;
  confidenceScore: number;
  valuationDate: string;
  methodology: 'avm' | 'cma' | 'expert';
  factors: ValuationFactor[];
  comparables: ComparableProperty[];
  marketTrends: MarketTrend[];
  reportUrl?: string;
}

export interface ValuationFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface ComparableProperty {
  id: string;
  address: string;
  salePrice: number;
  saleDate: string;
  distance: number; // in meters
  similarity: number; // percentage
  adjustments: PropertyAdjustment[];
}

export interface PropertyAdjustment {
  type: string;
  amount: number;
  reason: string;
}

export interface MarketTrend {
  period: string;
  appreciation: number;
  inventory: number;
  daysOnMarket: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PropertyInspection {
  id: string;
  propertyId: string;
  inspectorId: string;
  inspectionDate: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  checklist: InspectionItem[];
  photos: string[];
  notes: string;
  estimatedValue?: number;
}

export interface InspectionItem {
  category: string;
  item: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  notes?: string;
  photos?: string[];
}

export interface ValuationReport {
  id: string;
  valuationId: string;
  clientId: string;
  reportType: 'basic' | 'detailed' | 'expert';
  generatedAt: string;
  sections: ReportSection[];
  executiveSummary: string;
  conclusion: string;
  disclaimers: string[];
}

export interface ReportSection {
  title: string;
  content: string;
  charts?: string[];
  data?: Record<string, unknown>;
}

export interface ValuationDispute {
  id: string;
  valuationId: string;
  clientId: string;
  reason: string;
  requestedValue: number;
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  evidence: string[];
  resolution?: string;
  resolvedAt?: string;
}

export interface NeighborhoodInsights {
  id: string;
  neighborhoodName: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    zipCode: string;
  };
  safetyScore: number;
  walkabilityScore: number;
  overallRating: number;
  lastUpdated: string;
}

export interface SafetyData {
  neighborhoodId: string;
  crimeRate: number;
  violentCrimeRate: number;
  propertyCrimeRate: number;
  crimeTrend: 'improving' | 'worsening' | 'stable';
  topConcerns: string[];
  policeStations: number;
  emergencyResponseTime: number; // in minutes
}

export interface WalkabilityData {
  neighborhoodId: string;
  walkScore: number;
  bikeScore: number;
  transitScore: number;
  nearbyAmenities: {
    grocery: number;
    restaurants: number;
    shopping: number;
    parks: number;
    schools: number;
    hospitals: number;
  };
  pedestrianFriendly: boolean;
  bikeFriendly: boolean;
}

export interface SchoolData {
  neighborhoodId: string;
  schools: SchoolInfo[];
  averageRating: number;
  studentTeacherRatio: number;
  graduationRate: number;
  collegeReadiness: number;
}

export interface SchoolInfo {
  id: string;
  name: string;
  type: 'elementary' | 'middle' | 'high' | 'college';
  rating: number;
  distance: number; // in miles
  enrollment: number;
  studentTeacherRatio: number;
}

export interface AmenityData {
  neighborhoodId: string;
  categories: AmenityCategory[];
  densityScore: number;
  accessibilityScore: number;
}

export interface AmenityCategory {
  type: string;
  count: number;
  averageDistance: number;
  quality: 'low' | 'medium' | 'high';
  topRated: string[];
}

export interface TransportationData {
  neighborhoodId: string;
  publicTransit: {
    busRoutes: number;
    trainStations: number;
    lightRail: number;
    averageWaitTime: number;
  };
  commuteTimes: {
    toDowntown: number;
    toAirport: number;
    averageCommute: number;
  };
  parkingAvailability: 'scarce' | 'moderate' | 'abundant';
  trafficCongestion: 'low' | 'moderate' | 'high';
}

export interface DemographicData {
  neighborhoodId: string;
  population: number;
  medianAge: number;
  medianIncome: number;
  educationLevel: {
    highSchool: number;
    bachelors: number;
    graduate: number;
  };
  diversityIndex: number;
  homeownershipRate: number;
}

export interface FutureDevelopment {
  neighborhoodId: string;
  projects: DevelopmentProject[];
  growthRate: number;
  infrastructure: string[];
  expectedImpact: 'positive' | 'neutral' | 'negative';
}

export interface DevelopmentProject {
  id: string;
  name: string;
  type: 'residential' | 'commercial' | 'infrastructure' | 'mixed';
  status: 'planned' | 'under_construction' | 'completed';
  completionDate?: string;
  impact: string;
}

export interface NeighborhoodComparison {
  neighborhoods: string[];
  criteria: ComparisonCriteria[];
  rankings: { [neighborhoodId: string]: number };
}

export interface ComparisonCriteria {
  name: string;
  weight: number;
  description: string;
}

export interface Auction {
  id: string;
  propertyId: string;
  sellerId: string;
  title: string;
  description: string;
  startingPrice: number;
  currentBid: number;
  reservePrice?: number;
  bidIncrement: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled';
  auctionType: 'english' | 'dutch' | 'sealed_bid';
  location: {
    address: string;
    city: string;
    state: string;
    coordinates: { lat: number; lng: number };
  };
  images: string[];
  documents: string[];
  terms: string;
  winnerId?: string;
  finalPrice?: number;
  totalBids: number;
  watchers: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  timestamp: string;
  status: 'active' | 'outbid' | 'winning' | 'won';
  isProxy: boolean;
  maxProxyBid?: number;
}

export interface AuctionRules {
  auctionId: string;
  minimumBid: number;
  bidIncrement: number;
  reservePrice?: number;
  autoExtend: boolean;
  extendTime: number; // minutes
  maxBidsPerUser?: number;
  buyerPremium: number; // percentage
  paymentTerms: string;
  inspectionPeriod: number; // days
}

export interface AuctionAnalytics {
  auctionId: string;
  totalViews: number;
  uniqueWatchers: number;
  totalBids: number;
  averageBid: number;
  bidFrequency: number; // bids per hour
  topBidderActivity: {
    bidderId: string;
    bidCount: number;
    totalAmount: number;
  }[];
  geographicDistribution: {
    region: string;
    percentage: number;
  }[];
}

export interface AuctionNotification {
  id: string;
  auctionId: string;
  userId: string;
  type: 'outbid' | 'auction_ending' | 'auction_won' | 'auction_lost' | 'new_bid';
  message: string;
  sentAt: string;
  read: boolean;
}

export interface AuctionPayment {
  id: string;
  auctionId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  buyerPremium: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  dueDate: string;
  paidAt?: string;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  brokerage: string;
  specialization: string[];
  experience: number; // years
  rating: number;
  reviewCount: number;
  verified: boolean;
  certifications: string[];
  serviceAreas: string[];
  profilePicture?: string;
  bio: string;
  languages: string[];
  commissionRate: number;
  totalSales: number;
  totalCommission: number;
  activeListings: number;
  closedDeals: number;
}

export interface Lead {
  id: string;
  agentId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  propertyType: string;
  budget: {
    min: number;
    max: number;
  };
  location: string;
  requirements: string[];
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed' | 'lost';
  source: 'website' | 'referral' | 'social' | 'advertising' | 'cold_call';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  lastContact: string;
  nextFollowUp?: string;
  notes: string[];
  estimatedValue: number;
}

export interface Appointment {
  id: string;
  agentId: string;
  leadId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  propertyId?: string;
  type: 'showing' | 'meeting' | 'open_house' | 'virtual_tour' | 'closing';
  date: string;
  time: string;
  duration: number; // minutes
  location: string;
  notes: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  reminders: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  followUpRequired: boolean;
}

export interface Commission {
  id: string;
  agentId: string;
  dealId: string;
  dealType: 'sale' | 'rental' | 'auction';
  propertyId: string;
  commissionAmount: number;
  commissionRate: number;
  basePrice: number;
  status: 'pending' | 'calculated' | 'paid' | 'disputed';
  earnedAt: string;
  paidAt?: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface AgentAnalytics {
  agentId: string;
  period: string;
  metrics: {
    leadsGenerated: number;
    leadsConverted: number;
    conversionRate: number;
    appointmentsScheduled: number;
    appointmentsCompleted: number;
    showingsConducted: number;
    offersSubmitted: number;
    dealsClosed: number;
    closeRate: number;
    averageDealSize: number;
    totalCommission: number;
    averageCommission: number;
  };
  performance: {
    ranking: number;
    percentile: number;
    trend: 'improving' | 'declining' | 'stable';
    strengths: string[];
    areasForImprovement: string[];
  };
  clientSatisfaction: {
    averageRating: number;
    reviewCount: number;
    topCompliments: string[];
    commonComplaints: string[];
  };
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: 'licensing' | 'sales' | 'marketing' | 'legal' | 'technology';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  content: {
    videoUrl?: string;
    pdfUrl?: string;
    quiz?: QuizQuestion[];
  };
  prerequisites: string[];
  completionRate: number;
  averageScore: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface AgentCertification {
  id: string;
  agentId: string;
  certificationName: string;
  issuingBody: string;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'renewal_pending';
  certificateUrl?: string;
  continuingEducation: number; // hours required annually
}

export interface WorkOrder {
  id: string;
  maintenanceRequestId: string;
  propertyId: string;
  assignedContractorId?: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'cosmetic' | 'pest_control' | 'other';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'draft' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  estimatedCost: number;
  actualCost?: number;
  scheduledDate?: string;
  completedDate?: string;
  estimatedDuration: number; // hours
  actualDuration?: number;
  materials: MaterialItem[];
  notes: string[];
  photos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
}

export interface MaintenanceSchedule {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  category: string;
  estimatedCost: number;
  lastPerformed?: string;
  nextDue: string;
  assignedContractorId?: string;
  status: 'active' | 'overdue' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
}

export interface ContractorProfile {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  specializations: string[];
  serviceAreas: string[];
  rating: number;
  reviewCount: number;
  insuranceExpiry: string;
  bondingAmount: number;
  availability: {
    monday: { start: string; end: string };
    tuesday: { start: string; end: string };
    wednesday: { start: string; end: string };
    thursday: { start: string; end: string };
    friday: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday: { start: string; end: string };
  };
  emergencyContact: {
    name: string;
    phone: string;
  };
  certifications: string[];
  completedJobs: number;
  averageResponseTime: number; // hours
}

export interface MaintenanceAnalytics {
  propertyId: string;
  period: string;
  metrics: {
    totalRequests: number;
    completedRequests: number;
    averageResolutionTime: number; // days
    totalCost: number;
    averageCostPerRequest: number;
    emergencyRequests: number;
    recurringIssues: {
      category: string;
      frequency: number;
    }[];
    contractorPerformance: {
      contractorId: string;
      jobsCompleted: number;
      averageRating: number;
      onTimePercentage: number;
    }[];
  };
  trends: {
    requestVolume: number; // percentage change
    costTrend: number; // percentage change
    satisfactionTrend: number; // percentage change
  };
}

export interface MaintenanceReminder {
  id: string;
  propertyId: string;
  maintenanceScheduleId: string;
  type: 'scheduled' | 'overdue' | 'preventive';
  message: string;
  dueDate: string;
  sentDate?: string;
  acknowledged: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface InspectionChecklist {
  id: string;
  propertyId: string;
  inspectionType: 'move_in' | 'move_out' | 'annual' | 'seasonal' | 'pre_sale';
  items: ChecklistItem[];
  inspectorId?: string;
  scheduledDate: string;
  completedDate?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  notes: string;
  photos: string[];
}

export interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'not_applicable';
  notes?: string;
  photos?: string[];
  estimatedRepairCost?: number;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'lease' | 'contract' | 'agreement' | 'disclosure' | 'addendum' | 'notice';
  type: 'residential_lease' | 'commercial_lease' | 'rental_agreement' | 'service_contract' | 'maintenance_contract' | 'eviction_notice' | 'lead_disclosure' | 'pet_agreement';
  jurisdiction: string; // e.g., 'California', 'New York'
  language: string;
  version: string;
  isActive: boolean;
  isCustomizable: boolean;
  requiresLegalReview: boolean;
  tags: string[];
  content: string; // HTML/template content
  variables: TemplateVariable[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  usageCount: number;
}

export interface TemplateVariable {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    options?: string[];
  };
  defaultValue?: unknown;
}

export interface GeneratedDocument {
  id: string;
  templateId: string;
  title: string;
  propertyId?: string;
  parties: DocumentParty[];
  variables: Record<string, unknown>;
  content: string;
  status: 'draft' | 'review' | 'signed' | 'completed' | 'cancelled';
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  reviewedBy?: string;
  signedAt?: string;
  expiresAt?: string;
  attachments: DocumentAttachment[];
}

export interface DocumentParty {
  id: string;
  name: string;
  email: string;
  role: 'landlord' | 'tenant' | 'agent' | 'contractor' | 'witness';
  signature?: string;
  signedAt?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface ESignatureRequest {
  id: string;
  documentId: string;
  partyId: string;
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired';
  sentAt: string;
  viewedAt?: string;
  signedAt?: string;
  declinedAt?: string;
  expiresAt: string;
  reminderCount: number;
  lastReminderAt?: string;
}

export interface DocumentCompliance {
  documentId: string;
  jurisdiction: string;
  requirements: ComplianceRequirement[];
  status: 'compliant' | 'non_compliant' | 'pending_review' | 'requires_update';
  checkedAt: string;
  checkedBy: string;
  notes: string;
  recommendedActions: string[];
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  isMandatory: boolean;
  status: 'met' | 'not_met' | 'not_applicable';
  reference: string; // Legal reference or statute
  notes?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  changes: string;
  createdAt: string;
  createdBy: string;
  isCurrent: boolean;
}

export interface DocumentAnalytics {
  templateId?: string;
  period: string;
  metrics: {
    documentsCreated: number;
    documentsSigned: number;
    averageCompletionTime: number; // hours
    signatureRate: number; // percentage
    templateUsage: {
      templateId: string;
      usageCount: number;
      completionRate: number;
    }[];
    commonCustomizations: {
      variable: string;
      frequency: number;
    }[];
    complianceIssues: number;
    legalReviewRequests: number;
  };
  trends: {
    documentVolume: number; // percentage change
    completionRate: number; // percentage change
    signatureSpeed: number; // percentage change
  };
}

export interface LegalReview {
  id: string;
  documentId: string;
  reviewerId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'requires_revision';
  requestedAt: string;
  completedAt?: string;
  comments: ReviewComment[];
  overallAssessment: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedChanges: string[];
}

export interface ReviewComment {
  id: string;
  section: string;
  comment: string;
  severity: 'info' | 'warning' | 'error';
  suggestedChange?: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  permissions: AdminPermission[];
  lastLogin: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminPermission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete' | 'manage')[];
}

export interface PlatformAnalytics {
  period: string;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    totalProperties: number;
    activeListings: number;
    totalTransactions: number;
    revenue: number;
    conversionRate: number;
  };
  trends: {
    userGrowth: number;
    propertyGrowth: number;
    revenueGrowth: number;
    engagementRate: number;
  };
  demographics: {
    userByRole: { role: string; count: number }[];
    userByLocation: { location: string; count: number }[];
    deviceTypes: { device: string; percentage: number }[];
  };
}

export interface ContentModeration {
  id: string;
  contentType: 'property' | 'user' | 'review' | 'message' | 'document';
  contentId: string;
  reportedBy: string;
  reason: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
  notes: ModerationNote[];
}

export interface ModerationNote {
  id: string;
  author: string;
  note: string;
  createdAt: string;
}

export interface SystemConfiguration {
  id: string;
  category: string;
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  isPublic: boolean;
  lastModified: string;
  modifiedBy: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface FinancialReport {
  id: string;
  period: string;
  type: 'revenue' | 'commission' | 'transaction' | 'payout';
  data: {
    totalAmount: number;
    transactionCount: number;
    averageAmount: number;
    breakdown: { category: string; amount: number; percentage: number }[];
  };
  generatedAt: string;
  generatedBy: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  category: 'transaction' | 'reminder' | 'alert' | 'marketing' | 'system';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: 'technical' | 'billing' | 'account' | 'legal' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  assignedTo?: string;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface SupportMessage {
  id: string;
  authorId: string;
  authorType: 'user' | 'admin' | 'agent';
  message: string;
  attachments: string[];
  createdAt: string;
  isInternal: boolean;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers: string[];
  conditions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BackupStatus {
  id: string;
  type: 'database' | 'files' | 'configuration';
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  size?: number;
  location: string;
  retention: number; // days
}

export interface SystemHealth {
  services: {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    responseTime: number;
    lastChecked: string;
  }[];
  infrastructure: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  alerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  service?: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'accessibility' | 'security';
  category: 'frontend' | 'backend' | 'api' | 'database' | 'infrastructure';
  status: 'idle' | 'running' | 'passed' | 'failed' | 'cancelled';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  coverage?: number;
  lastRun: string;
  nextScheduled?: string;
  environment: string;
  tags: string[];
}

export interface TestCase {
  id: string;
  suiteId: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'functional' | 'ui' | 'api' | 'performance' | 'security' | 'accessibility';
  duration?: number;
  errorMessage?: string;
  stackTrace?: string;
  screenshots?: string[];
  steps: TestStep[];
  createdAt: string;
  updatedAt: string;
}

export interface TestStep {
  id: string;
  description: string;
  expectedResult: string;
  actualResult?: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
}

export interface TestRun {
  id: string;
  suiteId: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggeredBy: string;
  triggerType: 'manual' | 'scheduled' | 'commit' | 'deployment';
  environment: string;
  branch?: string;
  commit?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  coverage?: number;
  artifacts: TestArtifact[];
}

export interface TestArtifact {
  id: string;
  name: string;
  type: 'screenshot' | 'video' | 'log' | 'report' | 'trace';
  url: string;
  size: number;
  createdAt: string;
}

export interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
  type: 'bug' | 'feature_request' | 'improvement' | 'security_issue';
  component: string;
  assignee?: string;
  reporter: string;
  environment: string;
  browser?: string;
  os?: string;
  steps: string[];
  expectedResult: string;
  actualResult: string;
  attachments: string[];
  testCaseId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  comments: BugComment[];
}

export interface BugComment {
  id: string;
  author: string;
  comment: string;
  createdAt: string;
  attachments?: string[];
}

export interface PerformanceTest {
  id: string;
  name: string;
  description: string;
  type: 'load' | 'stress' | 'spike' | 'volume' | 'endurance';
  targetUrl: string;
  concurrentUsers: number;
  duration: number; // minutes
  rampUpTime: number; // seconds
  status: 'idle' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  metrics: PerformanceMetric[];
  thresholds: PerformanceThreshold[];
}

export interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  activeUsers: number;
}

export interface PerformanceThreshold {
  metric: string;
  operator: 'lt' | 'le' | 'gt' | 'ge' | 'eq';
  value: number;
  status: 'pass' | 'fail' | 'warning';
}

export interface AccessibilityTest {
  id: string;
  pageUrl: string;
  standard: 'WCAG2A' | 'WCAG2AA' | 'WCAG21A' | 'WCAG21AA';
  status: 'idle' | 'running' | 'completed' | 'failed';
  violations: AccessibilityViolation[];
  score: number;
  testedAt?: string;
  recommendations: string[];
}

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: {
    target: string;
    html: string;
    failureSummary: string;
  }[];
}

export interface SecurityTest {
  id: string;
  name: string;
  type: 'sast' | 'dast' | 'dependency_scan' | 'container_scan' | 'secret_scan';
  target: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  vulnerabilities: SecurityVulnerability[];
  score: number;
  testedAt?: string;
}

export interface SecurityVulnerability {
  id: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  cwe?: string;
  cvss?: number;
  affectedComponent: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
}

export interface TestCoverage {
  id: string;
  component: string;
  type: 'statement' | 'branch' | 'function' | 'line';
  coverage: number;
  total: number;
  covered: number;
  missed: number;
  lastUpdated: string;
}

export interface TestPipeline {
  id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  status: 'idle' | 'running' | 'passed' | 'failed' | 'cancelled';
  trigger: 'manual' | 'push' | 'pull_request' | 'schedule' | 'deployment';
  branch: string;
  commit: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: 'build' | 'test' | 'deploy' | 'security' | 'performance';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  logs: string;
  artifacts?: string[];
}

export interface VirtualTour {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  images: string[];
  videoUrl?: string;
  tourType: '360' | 'video' | 'guided';
  duration: number; // in minutes
  hotspots: TourHotspot[];
  analytics: TourAnalytics;
  createdAt: string;
}

export interface TourHotspot {
  id: string;
  position: { x: number; y: number; z: number };
  title: string;
  description: string;
  image?: string;
  linkedTour?: string;
}

export interface TourAnalytics {
  views: number;
  completionRate: number;
  averageTime: number;
  hotspotsClicked: { [hotspotId: string]: number };
  lastViewed: string;
}

export interface TourBooking {
  id: string;
  tourId: string;
  clientId: string;
  scheduledDate: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  agentId?: string;
  notes?: string;
}

export interface TourReview {
  id: string;
  tourId: string;
  clientId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
