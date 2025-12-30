import { Property, Booking, MaintenanceRequest, User, RoommateProfile, RoomAvailability, RoommateMatch, RoommateApplication, RoommateReview, Vendor, VendorService, VendorBooking, VendorReview, ServiceContract, InsuranceProvider, InsuranceQuote, InsurancePolicy, InsuranceClaim, InsuranceRecommendation, MortgageCalculator, MortgageResult, AffordabilityCalculator, AffordabilityResult, MortgageRate, RefinanceComparison, PreQualificationResult, PropertyValuation, PropertyInspection, ValuationReport, ValuationDispute, NeighborhoodInsights, SafetyData, WalkabilityData, SchoolData, AmenityData, TransportationData, DemographicData, FutureDevelopment, Auction, Bid, AuctionRules, AuctionAnalytics, AuctionNotification, AuctionPayment, Agent, Lead, Appointment, Commission, AgentAnalytics, TrainingModule, AgentCertification, WorkOrder, MaintenanceSchedule, ContractorProfile, MaintenanceAnalytics, MaintenanceReminder, InspectionChecklist, DocumentTemplate, GeneratedDocument, ESignatureRequest, DocumentCompliance, DocumentVersion, DocumentAnalytics, LegalReview, AdminUser, PlatformAnalytics, ContentModeration, SystemConfiguration, AuditLog, FinancialReport, NotificationTemplate, SupportTicket, FeatureFlag, BackupStatus, SystemHealth, TestSuite, TestCase, TestRun, BugReport, PerformanceTest, AccessibilityTest, SecurityTest, TestCoverage, TestPipeline } from '@/types';

export const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Modern Downtown Apartment',
    description: 'Beautiful 2-bedroom apartment in the heart of downtown with stunning city views. Features modern appliances, hardwood floors, and a spacious balcony.',
    type: 'apartment',
    price: 2500,
    location: {
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      coordinates: { lat: 37.7749, lng: -122.4194 }
    },
    images: ['/src/assets/property-1.jpg', '/src/assets/property-2.jpg'],
    bedrooms: 2,
    bathrooms: 2,
    area: 1200,
    amenities: ['Parking', 'Gym', 'Pool', 'Pet-friendly', 'Laundry'],
    status: 'available',
    landlordId: '1',
    availableFrom: '2024-12-01',
    featured: true
  },
  {
    id: '2',
    title: 'Luxury High-Rise Condo',
    description: 'Upscale 1-bedroom condo with panoramic views, concierge service, and access to premium building amenities.',
    type: 'condo',
    price: 3200,
    location: {
      address: '456 Tower Plaza',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    images: ['/src/assets/property-2.jpg', '/src/assets/property-3.jpg'],
    bedrooms: 1,
    bathrooms: 1,
    area: 850,
    amenities: ['Doorman', 'Gym', 'Roof deck', 'Storage', 'High-speed internet'],
    status: 'available',
    landlordId: '2',
    availableFrom: '2024-11-20',
    featured: true
  },
  {
    id: '3',
    title: 'Cozy Studio Near Campus',
    description: 'Perfect for students! Compact studio apartment within walking distance to university campus and public transit.',
    type: 'studio',
    price: 1400,
    location: {
      address: '789 College Ave',
      city: 'Boston',
      state: 'MA',
      zipCode: '02115',
      coordinates: { lat: 42.3601, lng: -71.0589 }
    },
    images: ['/src/assets/property-3.jpg', '/src/assets/property-1.jpg'],
    bedrooms: 0,
    bathrooms: 1,
    area: 450,
    amenities: ['Laundry', 'Bike storage', 'Study room', 'High-speed internet'],
    status: 'available',
    landlordId: '1',
    availableFrom: '2024-11-15'
  },
  {
    id: '4',
    title: 'Family Home with Yard',
    description: 'Spacious 4-bedroom house with large backyard, perfect for families. Quiet neighborhood with excellent schools.',
    type: 'house',
    price: 3800,
    location: {
      address: '321 Oak Street',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      coordinates: { lat: 30.2672, lng: -97.7431 }
    },
    images: ['/src/assets/property-1.jpg', '/src/assets/property-2.jpg'],
    bedrooms: 4,
    bathrooms: 3,
    area: 2400,
    amenities: ['Parking', 'Yard', 'Pet-friendly', 'Storage', 'Central AC'],
    status: 'available',
    landlordId: '3',
    availableFrom: '2024-12-15'
  }
];

export const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'tenant',
  verified: true,
  phone: '(555) 123-4567'
};

export const mockBookings: Booking[] = [
  {
    id: '1',
    propertyId: '1',
    tenantId: '1',
    startDate: '2024-12-01',
    endDate: '2025-12-01',
    status: 'confirmed',
    totalPrice: 30000,
    createdAt: '2024-11-01'
  }
];

export const mockMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: '1',
    propertyId: '1',
    tenantId: '1',
    category: 'plumbing',
    title: 'Leaking Kitchen Faucet',
    description: 'The kitchen faucet has been dripping constantly for the past week.',
    priority: 'medium',
    status: 'pending',
    createdAt: '2024-11-10T10:00:00Z',
    updatedAt: '2024-11-10T10:00:00Z'
  },
  {
    id: '2',
    propertyId: '1',
    tenantId: '1',
    category: 'hvac',
    title: 'AC Not Cooling',
    description: 'Air conditioning unit is running but not producing cold air.',
    priority: 'high',
    status: 'in_progress',
    createdAt: '2024-11-08T14:30:00Z',
    updatedAt: '2024-11-11T09:15:00Z'
  }
];

export const mockRoommateProfiles: RoommateProfile[] = [
  {
    id: '1',
    userId: '1',
    age: 25,
    occupation: 'Software Engineer',
    preferences: {
      smoking: false,
      pets: true,
      nightOwl: false,
      cleanliness: 4,
      socialLevel: 3
    },
    bio: 'Friendly and clean professional looking for compatible roommates.',
    budget: { min: 800, max: 1200 },
    lookingFor: ['clean', 'quiet', 'pet-friendly'],
    verified: true,
    backgroundCheck: true,
    reviews: []
  },
  {
    id: '2',
    userId: '2',
    age: 23,
    occupation: 'Student',
    preferences: {
      smoking: false,
      pets: false,
      nightOwl: true,
      cleanliness: 3,
      socialLevel: 4
    },
    bio: 'Outgoing student who loves to have fun and meet new people.',
    budget: { min: 600, max: 900 },
    lookingFor: ['social', 'fun', 'flexible'],
    verified: false,
    backgroundCheck: false,
    reviews: []
  }
];

export const mockRoomAvailabilities: RoomAvailability[] = [
  {
    id: '1',
    propertyId: '1',
    landlordId: '1',
    title: 'Shared Room in Downtown Apartment',
    description: 'Beautiful shared room in a modern downtown apartment. Looking for one more roommate.',
    rent: 1000,
    location: {
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102'
    },
    images: ['/src/assets/property-1.jpg'],
    availableFrom: '2024-12-01',
    roommatesNeeded: 1,
    currentRoommates: 1,
    preferences: {
      gender: 'any',
      ageRange: { min: 20, max: 35 },
      smoking: false,
      pets: true
    },
    amenities: ['Parking', 'Gym', 'Pool', 'Pet-friendly']
  },
  {
    id: '2',
    propertyId: '2',
    landlordId: '2',
    title: 'Room for Rent in Luxury Condo',
    description: 'Spacious room in a high-rise condo with amazing views. Perfect for professionals.',
    rent: 1500,
    location: {
      address: '456 Tower Plaza',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    },
    images: ['/src/assets/property-2.jpg'],
    availableFrom: '2024-11-20',
    roommatesNeeded: 2,
    currentRoommates: 0,
    preferences: {
      gender: 'any',
      ageRange: { min: 25, max: 40 },
      smoking: false,
      pets: false
    },
    amenities: ['Doorman', 'Gym', 'Roof deck']
  }
];

export const mockRoommateMatches: RoommateMatch[] = [
  {
    id: '1',
    userId: '1',
    roomAvailabilityId: '1',
    compatibilityScore: 85,
    matchedAt: '2024-11-15T10:00:00Z',
    status: 'interested'
  },
  {
    id: '2',
    userId: '2',
    roomAvailabilityId: '2',
    compatibilityScore: 78,
    matchedAt: '2024-11-16T14:30:00Z',
    status: 'pending'
  }
];

export const mockRoommateApplications: RoommateApplication[] = [
  {
    id: '1',
    userId: '1',
    roomAvailabilityId: '1',
    message: 'I am very interested in this room. I am clean, quiet, and responsible.',
    status: 'pending',
    appliedAt: '2024-11-15T11:00:00Z'
  }
];

export const mockRoommateReviews: RoommateReview[] = [
  {
    id: '1',
    reviewerId: '1',
    revieweeId: '2',
    rating: 4,
    comment: 'Great roommate, very respectful and clean.',
    createdAt: '2024-10-01T12:00:00Z'
  }
];

export const mockVendors: Vendor[] = [
  {
    id: '1',
    name: 'John Plumbing',
    email: 'john@plumbing.com',
    phone: '(555) 123-4567',
    businessName: 'John\'s Plumbing Services',
    description: 'Professional plumbing services for residential and commercial properties.',
    services: ['Plumbing Repair', 'Installation', 'Maintenance'],
    location: {
      address: '123 Service St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102'
    },
    rating: 4.5,
    reviewCount: 23,
    verified: true,
    licenseNumber: 'PL123456',
    insuranceExpiry: '2025-12-31',
    portfolio: ['/src/assets/property-1.jpg'],
    availability: {
      monday: { start: '08:00', end: '17:00' },
      tuesday: { start: '08:00', end: '17:00' },
      wednesday: { start: '08:00', end: '17:00' },
      thursday: { start: '08:00', end: '17:00' },
      friday: { start: '08:00', end: '17:00' },
      saturday: { start: '09:00', end: '15:00' },
      sunday: { start: '10:00', end: '14:00' }
    }
  },
  {
    id: '2',
    name: 'Sarah Cleaning',
    email: 'sarah@cleaning.com',
    phone: '(555) 987-6543',
    businessName: 'Sparkle Clean Services',
    description: 'Comprehensive cleaning services for homes and offices.',
    services: ['Deep Cleaning', 'Regular Cleaning', 'Move-in/Move-out Cleaning'],
    location: {
      address: '456 Clean Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    },
    rating: 4.8,
    reviewCount: 45,
    verified: true,
    licenseNumber: 'CL789012',
    insuranceExpiry: '2025-10-15',
    portfolio: ['/src/assets/property-2.jpg'],
    availability: {
      monday: { start: '07:00', end: '19:00' },
      tuesday: { start: '07:00', end: '19:00' },
      wednesday: { start: '07:00', end: '19:00' },
      thursday: { start: '07:00', end: '19:00' },
      friday: { start: '07:00', end: '19:00' },
      saturday: { start: '08:00', end: '18:00' },
      sunday: { start: '09:00', end: '16:00' }
    }
  }
];

export const mockVendorServices: VendorService[] = [
  {
    id: '1',
    vendorId: '1',
    name: 'Pipe Repair',
    description: 'Fix leaking pipes and plumbing issues',
    category: 'Plumbing',
    price: 150,
    duration: 120,
    materialsIncluded: true,
    warranty: '30 days'
  },
  {
    id: '2',
    vendorId: '2',
    name: 'Deep House Cleaning',
    description: 'Thorough cleaning of entire house',
    category: 'Cleaning',
    price: 200,
    duration: 240,
    materialsIncluded: true,
    warranty: '7 days'
  }
];

export const mockVendorBookings: VendorBooking[] = [
  {
    id: '1',
    vendorId: '1',
    serviceId: '1',
    clientId: '1',
    date: '2024-11-20',
    time: '10:00',
    status: 'confirmed',
    notes: 'Kitchen sink is leaking',
    totalPrice: 150,
    createdAt: '2024-11-15T10:00:00Z'
  }
];

export const mockVendorReviews: VendorReview[] = [
  {
    id: '1',
    bookingId: '1',
    clientId: '1',
    vendorId: '1',
    rating: 5,
    comment: 'Excellent service, very professional.',
    createdAt: '2024-11-21T12:00:00Z'
  }
];

export const mockServiceContracts: ServiceContract[] = [
  {
    id: '1',
    bookingId: '1',
    vendorId: '1',
    clientId: '1',
    terms: 'Standard service terms and conditions apply.',
    signedByVendor: true,
    signedByClient: true,
    signedAt: '2024-11-15T11:00:00Z'
  }
];

export const mockInsuranceProviders: InsuranceProvider[] = [
  {
    id: '1',
    name: 'SafeHome Insurance',
    logo: '/src/assets/property-1.jpg',
    description: 'Comprehensive property insurance for homeowners and landlords.',
    website: 'https://safehome.com',
    phone: '(555) 123-4567',
    email: 'info@safehome.com',
    coverageTypes: ['Property', 'Liability', 'Flood', 'Earthquake'],
    rating: 4.5,
    reviewCount: 1250
  },
  {
    id: '2',
    name: 'SecureLiving Insurance',
    logo: '/src/assets/property-2.jpg',
    description: 'Specialized insurance for rental properties and investments.',
    website: 'https://secureliving.com',
    phone: '(555) 987-6543',
    email: 'contact@secureliving.com',
    coverageTypes: ['Property', 'Rental Income', 'Liability', 'Business Interruption'],
    rating: 4.3,
    reviewCount: 890
  }
];

export const mockInsuranceQuotes: InsuranceQuote[] = [
  {
    id: '1',
    providerId: '1',
    propertyId: '1',
    clientId: '1',
    coverageType: 'Property',
    coverageAmount: 500000,
    premium: 1200,
    deductible: 1000,
    term: 12,
    createdAt: '2024-11-15T10:00:00Z',
    validUntil: '2024-11-30T10:00:00Z'
  }
];

export const mockInsurancePolicies: InsurancePolicy[] = [
  {
    id: '1',
    quoteId: '1',
    providerId: '1',
    propertyId: '1',
    clientId: '1',
    policyNumber: 'POL-2024-001',
    coverageType: 'Property',
    coverageAmount: 500000,
    premium: 1200,
    deductible: 1000,
    startDate: '2024-12-01',
    endDate: '2025-12-01',
    status: 'active',
    documents: ['policy.pdf', 'terms.pdf']
  }
];

export const mockInsuranceClaims: InsuranceClaim[] = [
  {
    id: '1',
    policyId: '1',
    clientId: '1',
    claimType: 'Water Damage',
    description: 'Pipe burst causing water damage to kitchen and living room.',
    incidentDate: '2024-11-20',
    reportedDate: '2024-11-21',
    status: 'under_review',
    claimAmount: 15000,
    documents: ['damage_photos.jpg', 'repair_estimate.pdf'],
    notes: 'Claim submitted, awaiting adjuster visit.'
  }
];

export const mockInsuranceRecommendations: InsuranceRecommendation[] = [
  {
    id: '1',
    propertyId: '1',
    clientId: '1',
    recommendedCoverage: 600000,
    recommendedDeductible: 1500,
    riskFactors: ['Flood Zone', 'High Crime Area'],
    suggestedProviders: ['1', '2'],
    createdAt: '2024-11-10T12:00:00Z'
  }
];

export const mockMortgageCalculator: MortgageCalculator = {
  loanAmount: 300000,
  interestRate: 6.5,
  loanTerm: 30,
  downPayment: 60000,
  propertyTax: 3600,
  insurance: 1200,
  pmi: 200
};

export const mockMortgageResult: MortgageResult = {
  monthlyPayment: 1918.59,
  totalPayment: 690692.40,
  totalInterest: 390692.40,
  amortizationSchedule: [
    {
      month: 1,
      payment: 1918.59,
      principal: 418.59,
      interest: 1500.00,
      balance: 299581.41
    }
  ]
};

export const mockAffordabilityCalculator: AffordabilityCalculator = {
  annualIncome: 80000,
  monthlyDebt: 800,
  downPayment: 60000,
  interestRate: 6.5,
  loanTerm: 30,
  propertyTaxRate: 1.2,
  insuranceRate: 0.4
};

export const mockAffordabilityResult: AffordabilityResult = {
  maxLoanAmount: 350000,
  maxHomePrice: 410000,
  monthlyPayment: 2200,
  debtToIncomeRatio: 33
};

export const mockMortgageRates: MortgageRate[] = [
  {
    lender: 'Bank of America',
    rate: 6.25,
    apr: 6.45,
    points: 0.5,
    fees: 2500,
    term: 30,
    lastUpdated: '2024-11-20T10:00:00Z'
  },
  {
    lender: 'Chase',
    rate: 6.125,
    apr: 6.35,
    points: 0.25,
    fees: 2200,
    term: 30,
    lastUpdated: '2024-11-20T10:00:00Z'
  }
];

export const mockRefinanceComparison: RefinanceComparison = {
  currentLoan: {
    balance: 280000,
    rate: 7.5,
    monthlyPayment: 2333,
    remainingTerm: 25
  },
  newLoan: {
    rate: 6.25,
    term: 30,
    closingCosts: 5000,
    monthlyPayment: 1708,
    totalSavings: 625,
    breakEvenPoint: 8
  }
};

export const mockPreQualificationResult: PreQualificationResult = {
  preQualifiedAmount: 320000,
  estimatedRate: 6.375,
  factors: ['Good credit score', 'Stable income', 'Low debt-to-income ratio'],
  nextSteps: ['Gather documents', 'Choose lender', 'Submit formal application']
};

export const mockPropertyValuations: PropertyValuation[] = [
  {
    id: '1',
    propertyId: '1',
    avmValue: 485000,
    confidenceScore: 85,
    valuationDate: '2024-11-20T10:00:00Z',
    methodology: 'avm',
    factors: [
      {
        factor: 'Location',
        impact: 'positive',
        weight: 25,
        description: 'Prime downtown location with excellent accessibility'
      },
      {
        factor: 'Condition',
        impact: 'positive',
        weight: 20,
        description: 'Well-maintained property with modern amenities'
      },
      {
        factor: 'Market Trends',
        impact: 'positive',
        weight: 15,
        description: 'Area experiencing 8% annual appreciation'
      }
    ],
    comparables: [
      {
        id: 'comp1',
        address: '120 Main St, San Francisco',
        salePrice: 475000,
        saleDate: '2024-10-15',
        distance: 500,
        similarity: 90,
        adjustments: [
          { type: 'size', amount: 5000, reason: 'Larger living area' },
          { type: 'condition', amount: -2000, reason: 'Needs minor repairs' }
        ]
      }
    ],
    marketTrends: [
      {
        period: '3 months',
        appreciation: 3.2,
        inventory: 45,
        daysOnMarket: 28,
        trend: 'up'
      },
      {
        period: '6 months',
        appreciation: 6.8,
        inventory: 52,
        daysOnMarket: 32,
        trend: 'up'
      }
    ]
  }
];

export const mockPropertyInspections: PropertyInspection[] = [
  {
    id: '1',
    propertyId: '1',
    inspectorId: 'inspector1',
    inspectionDate: '2024-11-18T14:00:00Z',
    status: 'completed',
    checklist: [
      {
        category: 'Structure',
        item: 'Foundation',
        condition: 'excellent',
        notes: 'Solid concrete foundation, no cracks or settling'
      },
      {
        category: 'Roof',
        item: 'Roof Condition',
        condition: 'good',
        notes: 'Recently replaced, minor wear but structurally sound'
      },
      {
        category: 'Plumbing',
        item: 'Pipes',
        condition: 'fair',
        notes: 'Some older pipes showing wear, recommend monitoring'
      }
    ],
    photos: ['/src/assets/property-1.jpg', '/src/assets/property-2.jpg'],
    notes: 'Overall well-maintained property. Minor maintenance items noted but nothing critical.',
    estimatedValue: 485000
  }
];

export const mockValuationReports: ValuationReport[] = [
  {
    id: '1',
    valuationId: '1',
    clientId: '1',
    reportType: 'detailed',
    generatedAt: '2024-11-20T15:00:00Z',
    sections: [
      {
        title: 'Executive Summary',
        content: 'The subject property is valued at $485,000 based on recent comparable sales and market analysis.'
      },
      {
        title: 'Property Description',
        content: 'Modern 2-bedroom apartment in downtown San Francisco with excellent amenities.'
      },
      {
        title: 'Market Analysis',
        content: 'The local market shows strong appreciation with low inventory levels.'
      }
    ],
    executiveSummary: 'This comprehensive valuation provides a reliable estimate of the property\'s current market value.',
    conclusion: 'Based on all factors considered, the estimated market value is $485,000.',
    disclaimers: [
      'This valuation is for informational purposes only',
      'Market conditions can change rapidly',
      'Professional appraisal recommended for legal purposes'
    ]
  }
];

export const mockValuationDisputes: ValuationDispute[] = [
  {
    id: '1',
    valuationId: '1',
    clientId: '1',
    reason: 'Client believes value is too low based on recent comparable sales',
    requestedValue: 510000,
    status: 'under_review',
    evidence: ['/src/assets/property-1.jpg', 'comparable_sales.pdf'],
    resolution: 'Under review by senior appraiser'
  }
];

export const mockNeighborhoodInsights: NeighborhoodInsights[] = [
  {
    id: '1',
    neighborhoodName: 'Downtown District',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102'
    },
    safetyScore: 85,
    walkabilityScore: 95,
    overallRating: 88,
    lastUpdated: '2024-11-20T10:00:00Z'
  },
  {
    id: '2',
    neighborhoodName: 'Mission District',
    location: {
      latitude: 37.7599,
      longitude: -122.4148,
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103'
    },
    safetyScore: 78,
    walkabilityScore: 88,
    overallRating: 82,
    lastUpdated: '2024-11-20T10:00:00Z'
  }
];

export const mockSafetyData: SafetyData[] = [
  {
    neighborhoodId: '1',
    crimeRate: 25.3,
    violentCrimeRate: 8.7,
    propertyCrimeRate: 16.6,
    crimeTrend: 'improving',
    topConcerns: ['Petty theft', 'Vehicle break-ins'],
    policeStations: 2,
    emergencyResponseTime: 4
  },
  {
    neighborhoodId: '2',
    crimeRate: 32.1,
    violentCrimeRate: 12.3,
    propertyCrimeRate: 19.8,
    crimeTrend: 'stable',
    topConcerns: ['Burglary', 'Vandalism'],
    policeStations: 1,
    emergencyResponseTime: 6
  }
];

export const mockWalkabilityData: WalkabilityData[] = [
  {
    neighborhoodId: '1',
    walkScore: 98,
    bikeScore: 85,
    transitScore: 92,
    nearbyAmenities: {
      grocery: 15,
      restaurants: 45,
      shopping: 25,
      parks: 8,
      schools: 5,
      hospitals: 3
    },
    pedestrianFriendly: true,
    bikeFriendly: true
  },
  {
    neighborhoodId: '2',
    walkScore: 88,
    bikeScore: 78,
    transitScore: 85,
    nearbyAmenities: {
      grocery: 12,
      restaurants: 32,
      shopping: 18,
      parks: 6,
      schools: 4,
      hospitals: 2
    },
    pedestrianFriendly: true,
    bikeFriendly: false
  }
];

export const mockSchoolData: SchoolData[] = [
  {
    neighborhoodId: '1',
    schools: [
      {
        id: 'school1',
        name: 'Lincoln Elementary',
        type: 'elementary',
        rating: 9,
        distance: 0.5,
        enrollment: 450,
        studentTeacherRatio: 22
      },
      {
        id: 'school2',
        name: 'Downtown High School',
        type: 'high',
        rating: 8,
        distance: 1.2,
        enrollment: 1200,
        studentTeacherRatio: 25
      }
    ],
    averageRating: 8.5,
    studentTeacherRatio: 23.5,
    graduationRate: 94,
    collegeReadiness: 87
  }
];

export const mockAmenityData: AmenityData[] = [
  {
    neighborhoodId: '1',
    categories: [
      {
        type: 'Grocery Stores',
        count: 15,
        averageDistance: 0.3,
        quality: 'high',
        topRated: ['Whole Foods Market', 'Trader Joe\'s']
      },
      {
        type: 'Restaurants',
        count: 45,
        averageDistance: 0.2,
        quality: 'high',
        topRated: ['The French Laundry', 'Nopa']
      },
      {
        type: 'Parks',
        count: 8,
        averageDistance: 0.4,
        quality: 'high',
        topRated: ['Golden Gate Park', 'Washington Square']
      }
    ],
    densityScore: 95,
    accessibilityScore: 92
  }
];

export const mockTransportationData: TransportationData[] = [
  {
    neighborhoodId: '1',
    publicTransit: {
      busRoutes: 12,
      trainStations: 3,
      lightRail: 2,
      averageWaitTime: 8
    },
    commuteTimes: {
      toDowntown: 5,
      toAirport: 35,
      averageCommute: 28
    },
    parkingAvailability: 'scarce',
    trafficCongestion: 'high'
  }
];

export const mockDemographicData: DemographicData[] = [
  {
    neighborhoodId: '1',
    population: 85000,
    medianAge: 38,
    medianIncome: 95000,
    educationLevel: {
      highSchool: 85,
      bachelors: 65,
      graduate: 35
    },
    diversityIndex: 78,
    homeownershipRate: 45
  }
];

export const mockFutureDevelopment: FutureDevelopment[] = [
  {
    neighborhoodId: '1',
    projects: [
      {
        id: 'proj1',
        name: 'Downtown Transit Hub',
        type: 'infrastructure',
        status: 'under_construction',
        completionDate: '2025-06-01',
        impact: 'Improved public transit access'
      },
      {
        id: 'proj2',
        name: 'Riverside Apartments',
        type: 'residential',
        status: 'planned',
        completionDate: '2026-01-01',
        impact: 'Additional housing units'
      }
    ],
    growthRate: 12.5,
    infrastructure: ['New subway line', 'Bike lanes', 'Green spaces'],
    expectedImpact: 'positive'
  }
];

export const mockAuctions: Auction[] = [
  {
    id: '1',
    propertyId: '1',
    sellerId: '1',
    title: 'Modern Downtown Apartment - Bank Foreclosure',
    description: 'Beautiful 2-bedroom apartment in prime downtown location. Recently renovated with modern amenities. Perfect for investors or owner-occupants.',
    startingPrice: 450000,
    currentBid: 485000,
    reservePrice: 475000,
    bidIncrement: 5000,
    startDate: '2024-11-20T10:00:00Z',
    endDate: '2024-11-27T10:00:00Z',
    status: 'active',
    auctionType: 'english',
    location: {
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      coordinates: { lat: 37.7749, lng: -122.4194 }
    },
    images: ['/src/assets/property-1.jpg', '/src/assets/property-2.jpg'],
    documents: ['title_deed.pdf', 'inspection_report.pdf'],
    terms: '10% buyer\'s premium. 5-day inspection period. Cash or conventional financing only.',
    totalBids: 23,
    watchers: 156
  },
  {
    id: '2',
    propertyId: '2',
    sellerId: '2',
    title: 'Luxury High-Rise Condo - Estate Sale',
    description: 'Stunning 1-bedroom condo with panoramic city views. Premium building amenities including concierge, gym, and rooftop pool.',
    startingPrice: 320000,
    currentBid: 365000,
    reservePrice: 350000,
    bidIncrement: 2500,
    startDate: '2024-11-18T14:00:00Z',
    endDate: '2024-11-25T14:00:00Z',
    status: 'active',
    auctionType: 'english',
    location: {
      address: '456 Tower Plaza',
      city: 'New York',
      state: 'NY',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    images: ['/src/assets/property-2.jpg', '/src/assets/property-3.jpg'],
    documents: ['estate_documents.pdf', 'hoa_bylaws.pdf'],
    terms: '8% buyer\'s premium. 7-day inspection period. All financing types accepted.',
    totalBids: 31,
    watchers: 203
  },
  {
    id: '3',
    propertyId: '3',
    sellerId: '1',
    title: 'Cozy Studio Near Campus - Quick Sale',
    description: 'Perfect student housing near university campus. Recently updated with new appliances and flooring.',
    startingPrice: 140000,
    currentBid: 152000,
    bidIncrement: 1000,
    startDate: '2024-11-15T09:00:00Z',
    endDate: '2024-11-22T09:00:00Z',
    status: 'ended',
    auctionType: 'english',
    location: {
      address: '789 College Ave',
      city: 'Boston',
      state: 'MA',
      coordinates: { lat: 42.3601, lng: -71.0589 }
    },
    images: ['/src/assets/property-3.jpg', '/src/assets/property-1.jpg'],
    documents: ['title.pdf', 'recent_repairs.pdf'],
    terms: '5% buyer\'s premium. 3-day inspection period. Cash preferred.',
    winnerId: 'bidder3',
    finalPrice: 152000,
    totalBids: 18,
    watchers: 89
  }
];

export const mockBids: Bid[] = [
  {
    id: '1',
    auctionId: '1',
    bidderId: 'bidder1',
    amount: 485000,
    timestamp: '2024-11-24T15:30:00Z',
    status: 'winning',
    isProxy: false
  },
  {
    id: '2',
    auctionId: '1',
    bidderId: 'bidder2',
    amount: 480000,
    timestamp: '2024-11-24T14:45:00Z',
    status: 'outbid',
    isProxy: true,
    maxProxyBid: 500000
  },
  {
    id: '3',
    auctionId: '2',
    bidderId: 'bidder3',
    amount: 365000,
    timestamp: '2024-11-23T16:20:00Z',
    status: 'winning',
    isProxy: false
  }
];

export const mockAuctionRules: AuctionRules[] = [
  {
    auctionId: '1',
    minimumBid: 450000,
    bidIncrement: 5000,
    reservePrice: 475000,
    autoExtend: true,
    extendTime: 5,
    maxBidsPerUser: 10,
    buyerPremium: 10,
    paymentTerms: 'Full payment due within 48 hours of auction end',
    inspectionPeriod: 5
  }
];

export const mockAuctionAnalytics: AuctionAnalytics[] = [
  {
    auctionId: '1',
    totalViews: 1250,
    uniqueWatchers: 156,
    totalBids: 23,
    averageBid: 476087,
    bidFrequency: 2.3,
    topBidderActivity: [
      {
        bidderId: 'bidder1',
        bidCount: 8,
        totalAmount: 485000
      },
      {
        bidderId: 'bidder2',
        bidCount: 6,
        totalAmount: 480000
      }
    ],
    geographicDistribution: [
      { region: 'California', percentage: 45 },
      { region: 'Nevada', percentage: 25 },
      { region: 'Oregon', percentage: 20 },
      { region: 'Other', percentage: 10 }
    ]
  }
];

export const mockAuctionNotifications: AuctionNotification[] = [
  {
    id: '1',
    auctionId: '1',
    userId: 'bidder2',
    type: 'outbid',
    message: 'You have been outbid on "Modern Downtown Apartment". Current bid: $485,000',
    sentAt: '2024-11-24T15:31:00Z',
    read: false
  },
  {
    id: '2',
    auctionId: '1',
    userId: 'bidder1',
    type: 'auction_ending',
    message: 'Auction "Modern Downtown Apartment" ends in 2 hours. You are currently winning!',
    sentAt: '2024-11-27T08:00:00Z',
    read: true
  }
];

export const mockAuctionPayments: AuctionPayment[] = [
  {
    id: '1',
    auctionId: '3',
    buyerId: 'bidder3',
    sellerId: '1',
    amount: 152000,
    buyerPremium: 7600,
    totalAmount: 159600,
    status: 'completed',
    paymentMethod: 'wire_transfer',
    transactionId: 'TXN_20241122_001',
    dueDate: '2024-11-25T09:00:00Z',
    paidAt: '2024-11-24T10:30:00Z'
  }
];

export const mockAgents: Agent[] = [
  {
    id: '1',
    userId: 'agent1',
    name: 'Sarah Johnson',
    email: 'sarah@realtypro.com',
    phone: '(555) 123-4567',
    licenseNumber: 'CA-DRE-12345678',
    licenseExpiry: '2025-12-31',
    brokerage: 'Realty Pro Brokers',
    specialization: ['Residential', 'Investment Properties', 'Luxury Homes'],
    experience: 8,
    rating: 4.8,
    reviewCount: 127,
    verified: true,
    certifications: ['CRS', 'GRI', 'SFR'],
    serviceAreas: ['San Francisco', 'Oakland', 'Berkeley'],
    bio: 'Dedicated real estate professional with 8+ years of experience helping clients find their dream homes.',
    languages: ['English', 'Spanish'],
    commissionRate: 3.0,
    totalSales: 4500000,
    totalCommission: 135000,
    activeListings: 12,
    closedDeals: 23
  },
  {
    id: '2',
    userId: 'agent2',
    name: 'Michael Chen',
    email: 'michael@urbanrealty.com',
    phone: '(555) 987-6543',
    licenseNumber: 'CA-DRE-87654321',
    licenseExpiry: '2025-08-15',
    brokerage: 'Urban Realty Group',
    specialization: ['Condominiums', 'Downtown Properties', 'First-time Buyers'],
    experience: 5,
    rating: 4.6,
    reviewCount: 89,
    verified: true,
    certifications: ['ABR', 'SRES'],
    serviceAreas: ['San Francisco', 'San Mateo', 'Palo Alto'],
    bio: 'Specializing in urban properties and helping first-time buyers navigate the market.',
    languages: ['English', 'Mandarin'],
    commissionRate: 2.5,
    totalSales: 3200000,
    totalCommission: 80000,
    activeListings: 8,
    closedDeals: 16
  }
];

export const mockLeads: Lead[] = [
  {
    id: '1',
    agentId: '1',
    clientName: 'John Smith',
    clientEmail: 'john.smith@email.com',
    clientPhone: '(555) 111-2222',
    propertyType: 'Single Family Home',
    budget: { min: 800000, max: 1200000 },
    location: 'San Francisco',
    requirements: ['3+ bedrooms', '2 bathrooms', 'garage', 'good schools'],
    status: 'qualified',
    source: 'website',
    priority: 'high',
    createdAt: '2024-11-15T10:00:00Z',
    lastContact: '2024-11-20T14:30:00Z',
    nextFollowUp: '2024-11-25T10:00:00Z',
    notes: [
      'Very motivated buyer',
      'Prefers Victorian homes',
      'Has pre-approval letter'
    ],
    estimatedValue: 1000000
  },
  {
    id: '2',
    agentId: '1',
    clientName: 'Emily Davis',
    clientEmail: 'emily.davis@email.com',
    clientPhone: '(555) 333-4444',
    propertyType: 'Condominium',
    budget: { min: 600000, max: 800000 },
    location: 'Downtown SF',
    requirements: ['2 bedrooms', 'modern amenities', 'parking'],
    status: 'proposal',
    source: 'referral',
    priority: 'medium',
    createdAt: '2024-11-18T09:15:00Z',
    lastContact: '2024-11-22T11:00:00Z',
    notes: [
      'Looking for investment property',
      'Open to fixer-uppers',
      'Has cash buyer'
    ],
    estimatedValue: 700000
  }
];

export const mockAppointments: Appointment[] = [
  {
    id: '1',
    agentId: '1',
    leadId: '1',
    clientName: 'John Smith',
    clientEmail: 'john.smith@email.com',
    clientPhone: '(555) 111-2222',
    propertyId: '1',
    type: 'showing',
    date: '2024-11-25',
    time: '14:00',
    duration: 60,
    location: '123 Main Street, San Francisco',
    notes: 'Showing the Victorian home in Mission District',
    status: 'scheduled',
    reminders: { email: true, sms: true, push: true },
    followUpRequired: true
  },
  {
    id: '2',
    agentId: '2',
    leadId: '2',
    clientName: 'Emily Davis',
    clientEmail: 'emily.davis@email.com',
    clientPhone: '(555) 333-4444',
    type: 'meeting',
    date: '2024-11-26',
    time: '10:30',
    duration: 45,
    location: 'Virtual Meeting',
    notes: 'Discuss investment opportunities in downtown area',
    status: 'confirmed',
    reminders: { email: true, sms: false, push: true },
    followUpRequired: false
  }
];

export const mockCommissions: Commission[] = [
  {
    id: '1',
    agentId: '1',
    dealId: 'deal1',
    dealType: 'sale',
    propertyId: '1',
    commissionAmount: 27000,
    commissionRate: 3.0,
    basePrice: 900000,
    status: 'paid',
    earnedAt: '2024-10-15T00:00:00Z',
    paidAt: '2024-10-30T00:00:00Z',
    paymentMethod: 'direct_deposit',
    transactionId: 'COMM_20241030_001'
  },
  {
    id: '2',
    agentId: '2',
    dealId: 'deal2',
    dealType: 'rental',
    propertyId: '2',
    commissionAmount: 1800,
    commissionRate: 50,
    basePrice: 3600,
    status: 'pending',
    earnedAt: '2024-11-01T00:00:00Z'
  }
];

export const mockAgentAnalytics: AgentAnalytics[] = [
  {
    agentId: '1',
    period: 'last_30_days',
    metrics: {
      leadsGenerated: 24,
      leadsConverted: 8,
      conversionRate: 33.3,
      appointmentsScheduled: 15,
      appointmentsCompleted: 12,
      showingsConducted: 18,
      offersSubmitted: 6,
      dealsClosed: 3,
      closeRate: 50,
      averageDealSize: 950000,
      totalCommission: 85500,
      averageCommission: 28500
    },
    performance: {
      ranking: 3,
      percentile: 85,
      trend: 'improving',
      strengths: ['Lead conversion', 'Client communication', 'Market knowledge'],
      areasForImprovement: ['Social media presence', 'Open house attendance']
    },
    clientSatisfaction: {
      averageRating: 4.8,
      reviewCount: 127,
      topCompliments: ['Responsive', 'Knowledgeable', 'Professional'],
      commonComplaints: ['Sometimes slow to respond on weekends']
    }
  }
];

export const mockTrainingModules: TrainingModule[] = [
  {
    id: '1',
    title: 'Real Estate Licensing Fundamentals',
    description: 'Complete guide to obtaining and maintaining your real estate license',
    category: 'licensing',
    difficulty: 'beginner',
    duration: 180,
    content: {
      videoUrl: '/videos/licensing-basics.mp4',
      pdfUrl: '/docs/licensing-guide.pdf',
      quiz: [
        {
          question: 'What is the minimum age requirement for a real estate license?',
          options: ['18', '21', '25', '30'],
          correctAnswer: 1,
          explanation: 'You must be at least 21 years old to obtain a real estate license.'
        }
      ]
    },
    prerequisites: [],
    completionRate: 89,
    averageScore: 85
  },
  {
    id: '2',
    title: 'Advanced Negotiation Techniques',
    description: 'Master the art of negotiation in real estate transactions',
    category: 'sales',
    difficulty: 'advanced',
    duration: 120,
    content: {
      videoUrl: '/videos/negotiation-masterclass.mp4',
      quiz: []
    },
    prerequisites: ['Real Estate Licensing Fundamentals'],
    completionRate: 67,
    averageScore: 78
  }
];

export const mockAgentCertifications: AgentCertification[] = [
  {
    id: '1',
    agentId: '1',
    certificationName: 'Certified Residential Specialist (CRS)',
    issuingBody: 'RESO',
    issueDate: '2022-03-15',
    expiryDate: '2025-03-15',
    status: 'active',
    certificateUrl: '/certificates/crs_sarah_johnson.pdf',
    continuingEducation: 30
  },
  {
    id: '2',
    agentId: '1',
    certificationName: 'Graduate Realtor Institute (GRI)',
    issuingBody: 'National Association of Realtors',
    issueDate: '2023-01-20',
    expiryDate: '2026-01-20',
    status: 'active',
    certificateUrl: '/certificates/gri_sarah_johnson.pdf',
    continuingEducation: 15
  }
];

export const mockWorkOrders: WorkOrder[] = [
  {
    id: '1',
    maintenanceRequestId: '1',
    propertyId: '1',
    assignedContractorId: 'contractor1',
    title: 'Kitchen Faucet Repair',
    description: 'Replace leaking kitchen faucet with new modern fixture',
    category: 'plumbing',
    priority: 'medium',
    status: 'in_progress',
    estimatedCost: 250,
    actualCost: 220,
    scheduledDate: '2024-11-25T10:00:00Z',
    estimatedDuration: 2,
    actualDuration: 1.5,
    materials: [
      {
        id: 'mat1',
        name: 'Kitchen Faucet',
        quantity: 1,
        unitCost: 150,
        totalCost: 150,
        supplier: 'Home Depot'
      },
      {
        id: 'mat2',
        name: 'Plumber Tape',
        quantity: 1,
        unitCost: 5,
        totalCost: 5,
        supplier: 'Local Hardware'
      }
    ],
    notes: [
      'Customer requested brushed nickel finish',
      'Used existing shutoff valves',
      'Tested for leaks - all clear'
    ],
    photos: ['/photos/before_repair.jpg', '/photos/after_repair.jpg'],
    createdAt: '2024-11-20T09:00:00Z',
    updatedAt: '2024-11-25T11:30:00Z'
  },
  {
    id: '2',
    maintenanceRequestId: '2',
    propertyId: '1',
    assignedContractorId: 'contractor2',
    title: 'AC Unit Maintenance',
    description: 'Annual HVAC maintenance and filter replacement',
    category: 'hvac',
    priority: 'low',
    status: 'scheduled',
    estimatedCost: 150,
    scheduledDate: '2024-11-28T14:00:00Z',
    estimatedDuration: 1.5,
    materials: [
      {
        id: 'mat3',
        name: 'HVAC Filter (4-pack)',
        quantity: 1,
        unitCost: 40,
        totalCost: 40,
        supplier: 'HVAC Supply Co'
      }
    ],
    notes: ['Annual maintenance check', 'Replace air filters'],
    photos: [],
    createdAt: '2024-11-22T10:00:00Z',
    updatedAt: '2024-11-22T10:00:00Z'
  }
];

export const mockMaintenanceSchedules: MaintenanceSchedule[] = [
  {
    id: '1',
    propertyId: '1',
    title: 'HVAC Filter Replacement',
    description: 'Replace air filters every 3 months',
    frequency: 'quarterly',
    category: 'hvac',
    estimatedCost: 50,
    lastPerformed: '2024-08-15T00:00:00Z',
    nextDue: '2024-11-15T00:00:00Z',
    assignedContractorId: 'contractor2',
    status: 'overdue',
    priority: 'medium'
  },
  {
    id: '2',
    propertyId: '1',
    title: 'Smoke Detector Battery Check',
    description: 'Test and replace batteries in smoke detectors',
    frequency: 'semi-annual',
    category: 'electrical',
    estimatedCost: 25,
    lastPerformed: '2024-05-10T00:00:00Z',
    nextDue: '2024-11-10T00:00:00Z',
    status: 'overdue',
    priority: 'high'
  },
  {
    id: '3',
    propertyId: '1',
    title: 'Gutter Cleaning',
    description: 'Clean and inspect gutters for debris',
    frequency: 'semi-annual',
    category: 'structural',
    estimatedCost: 120,
    lastPerformed: '2024-04-20T00:00:00Z',
    nextDue: '2024-10-20T00:00:00Z',
    status: 'active',
    priority: 'low'
  }
];

export const mockContractors: ContractorProfile[] = [
  {
    id: 'contractor1',
    name: 'Mike Johnson',
    businessName: 'Johnson Plumbing Services',
    email: 'mike@johnsonplumbing.com',
    phone: '(555) 123-4567',
    licenseNumber: 'PL-123456',
    licenseExpiry: '2025-06-30',
    specializations: ['Plumbing', 'Water Heaters', 'Drain Cleaning'],
    serviceAreas: ['San Francisco', 'Oakland', 'Berkeley'],
    rating: 4.7,
    reviewCount: 89,
    insuranceExpiry: '2025-12-31',
    bondingAmount: 50000,
    availability: {
      monday: { start: '07:00', end: '17:00' },
      tuesday: { start: '07:00', end: '17:00' },
      wednesday: { start: '07:00', end: '17:00' },
      thursday: { start: '07:00', end: '17:00' },
      friday: { start: '07:00', end: '17:00' },
      saturday: { start: '08:00', end: '12:00' },
      sunday: { start: 'emergency only', end: 'emergency only' }
    },
    emergencyContact: {
      name: 'Sarah Johnson',
      phone: '(555) 123-4568'
    },
    certifications: ['Master Plumber', 'EPA Lead Safe'],
    completedJobs: 234,
    averageResponseTime: 2.5
  },
  {
    id: 'contractor2',
    name: 'Lisa Chen',
    businessName: 'Comfort HVAC Solutions',
    email: 'lisa@comforthvac.com',
    phone: '(555) 987-6543',
    licenseNumber: 'HVAC-789012',
    licenseExpiry: '2025-08-15',
    specializations: ['HVAC', 'Air Conditioning', 'Heating Systems'],
    serviceAreas: ['San Francisco', 'San Mateo', 'Palo Alto'],
    rating: 4.8,
    reviewCount: 156,
    insuranceExpiry: '2025-10-20',
    bondingAmount: 75000,
    availability: {
      monday: { start: '08:00', end: '18:00' },
      tuesday: { start: '08:00', end: '18:00' },
      wednesday: { start: '08:00', end: '18:00' },
      thursday: { start: '08:00', end: '18:00' },
      friday: { start: '08:00', end: '18:00' },
      saturday: { start: '09:00', end: '15:00' },
      sunday: { start: 'emergency only', end: 'emergency only' }
    },
    emergencyContact: {
      name: 'Tom Chen',
      phone: '(555) 987-6544'
    },
    certifications: ['NATE Certified', 'EPA Universal'],
    completedJobs: 312,
    averageResponseTime: 3.2
  }
];

export const mockMaintenanceAnalytics: MaintenanceAnalytics = {
  propertyId: '1',
  period: 'last_6_months',
  metrics: {
    totalRequests: 24,
    completedRequests: 22,
    averageResolutionTime: 3.2,
    totalCost: 4850,
    averageCostPerRequest: 201.25,
    emergencyRequests: 3,
    recurringIssues: [
      { category: 'plumbing', frequency: 8 },
      { category: 'hvac', frequency: 5 },
      { category: 'electrical', frequency: 4 }
    ],
    contractorPerformance: [
      {
        contractorId: 'contractor1',
        jobsCompleted: 12,
        averageRating: 4.7,
        onTimePercentage: 95
      },
      {
        contractorId: 'contractor2',
        jobsCompleted: 8,
        averageRating: 4.8,
        onTimePercentage: 100
      }
    ]
  },
  trends: {
    requestVolume: 12.5,
    costTrend: -8.3,
    satisfactionTrend: 5.2
  }
};

export const mockMaintenanceReminders: MaintenanceReminder[] = [
  {
    id: '1',
    propertyId: '1',
    maintenanceScheduleId: '1',
    type: 'overdue',
    message: 'HVAC filter replacement is overdue by 10 days',
    dueDate: '2024-11-15T00:00:00Z',
    sentDate: '2024-11-20T09:00:00Z',
    acknowledged: false,
    priority: 'medium'
  },
  {
    id: '2',
    propertyId: '1',
    maintenanceScheduleId: '2',
    type: 'scheduled',
    message: 'Smoke detector battery check due in 5 days',
    dueDate: '2024-11-10T00:00:00Z',
    acknowledged: false,
    priority: 'high'
  }
];

export const mockInspectionChecklists: InspectionChecklist[] = [
  {
    id: '1',
    propertyId: '1',
    inspectionType: 'annual',
    items: [
      {
        id: 'item1',
        category: 'Plumbing',
        item: 'Kitchen sink faucet',
        condition: 'good',
        notes: 'Minor drip, scheduled for repair'
      },
      {
        id: 'item2',
        category: 'Electrical',
        item: 'Smoke detectors',
        condition: 'excellent',
        notes: 'All working properly, batteries fresh'
      },
      {
        id: 'item3',
        category: 'HVAC',
        item: 'Air conditioning unit',
        condition: 'good',
        notes: 'Running efficiently, filters clean'
      }
    ],
    inspectorId: 'inspector1',
    scheduledDate: '2024-11-15T10:00:00Z',
    completedDate: '2024-11-15T12:30:00Z',
    status: 'passed',
    overallCondition: 'good',
    notes: 'Property in good condition. Minor plumbing issue noted and scheduled for repair.',
    photos: ['/inspections/annual_2024_01.jpg', '/inspections/annual_2024_02.jpg']
  }
];

export const mockDocumentTemplates: DocumentTemplate[] = [
  {
    id: '1',
    name: 'Standard Residential Lease Agreement',
    description: 'Comprehensive lease agreement for residential properties with all standard clauses',
    category: 'lease',
    type: 'residential_lease',
    jurisdiction: 'California',
    language: 'English',
    version: '2.1',
    isActive: true,
    isCustomizable: true,
    requiresLegalReview: true,
    tags: ['residential', 'lease', 'standard', 'comprehensive'],
    content: '<h1>RESIDENTIAL LEASE AGREEMENT</h1><p>This Lease Agreement... {{landlord_name}}... {{tenant_name}}...</p>',
    variables: [
      {
        id: 'landlord_name',
        name: 'landlord_name',
        type: 'text',
        label: 'Landlord Full Name',
        required: true,
        validation: { minLength: 2, maxLength: 100 }
      },
      {
        id: 'tenant_name',
        name: 'tenant_name',
        type: 'text',
        label: 'Tenant Full Name',
        required: true,
        validation: { minLength: 2, maxLength: 100 }
      },
      {
        id: 'property_address',
        name: 'property_address',
        type: 'text',
        label: 'Property Address',
        required: true
      },
      {
        id: 'monthly_rent',
        name: 'monthly_rent',
        type: 'number',
        label: 'Monthly Rent Amount',
        required: true,
        validation: { minLength: 1 }
      },
      {
        id: 'lease_start_date',
        name: 'lease_start_date',
        type: 'date',
        label: 'Lease Start Date',
        required: true
      },
      {
        id: 'lease_term_months',
        name: 'lease_term_months',
        type: 'select',
        label: 'Lease Term (Months)',
        required: true,
        validation: { options: ['6', '12', '18', '24', '36'] }
      }
    ],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-11-01T14:30:00Z',
    createdBy: 'admin',
    usageCount: 245
  },
  {
    id: '2',
    name: 'Pet Addendum Agreement',
    description: 'Standard addendum for pet agreements in rental properties',
    category: 'addendum',
    type: 'pet_agreement',
    jurisdiction: 'California',
    language: 'English',
    version: '1.3',
    isActive: true,
    isCustomizable: true,
    requiresLegalReview: false,
    tags: ['pet', 'addendum', 'animal', 'policy'],
    content: '<h2>PET ADDENDUM</h2><p>This Pet Addendum... {{pet_type}}... {{pet_breed}}...</p>',
    variables: [
      {
        id: 'pet_type',
        name: 'pet_type',
        type: 'select',
        label: 'Pet Type',
        required: true,
        validation: { options: ['Dog', 'Cat', 'Bird', 'Fish', 'Other'] }
      },
      {
        id: 'pet_breed',
        name: 'pet_breed',
        type: 'text',
        label: 'Pet Breed',
        required: false
      },
      {
        id: 'pet_weight',
        name: 'pet_weight',
        type: 'number',
        label: 'Pet Weight (lbs)',
        required: false
      },
      {
        id: 'monthly_pet_fee',
        name: 'monthly_pet_fee',
        type: 'number',
        label: 'Monthly Pet Fee',
        required: true,
        defaultValue: 50
      }
    ],
    createdAt: '2024-03-20T09:15:00Z',
    updatedAt: '2024-10-15T11:20:00Z',
    createdBy: 'admin',
    usageCount: 89
  },
  {
    id: '3',
    name: 'Lead-Based Paint Disclosure',
    description: 'Federal requirement disclosure for properties built before 1978',
    category: 'disclosure',
    type: 'lead_disclosure',
    jurisdiction: 'Federal',
    language: 'English',
    version: '1.0',
    isActive: true,
    isCustomizable: false,
    requiresLegalReview: true,
    tags: ['disclosure', 'federal', 'lead', 'paint', 'compliance'],
    content: '<h2>LEAD-BASED PAINT DISCLOSURE</h2><p>Federal law requires...</p>',
    variables: [
      {
        id: 'property_built_year',
        name: 'property_built_year',
        type: 'number',
        label: 'Year Property Was Built',
        required: true,
        validation: { minLength: 4, maxLength: 4 }
      },
      {
        id: 'has_lead_paint',
        name: 'has_lead_paint',
        type: 'boolean',
        label: 'Property has known lead-based paint',
        required: true
      }
    ],
    createdAt: '2024-02-10T13:45:00Z',
    updatedAt: '2024-02-10T13:45:00Z',
    createdBy: 'admin',
    usageCount: 156
  }
];

export const mockGeneratedDocuments: GeneratedDocument[] = [
  {
    id: '1',
    templateId: '1',
    title: 'Lease Agreement - 123 Main Street',
    propertyId: '1',
    parties: [
      {
        id: 'party1',
        name: 'John Smith',
        email: 'john.smith@email.com',
        role: 'tenant'
      },
      {
        id: 'party2',
        name: 'Sarah Johnson',
        email: 'sarah@realtypro.com',
        role: 'landlord'
      }
    ],
    variables: {
      landlord_name: 'Sarah Johnson',
      tenant_name: 'John Smith',
      property_address: '123 Main Street, San Francisco, CA',
      monthly_rent: 2500,
      lease_start_date: '2024-12-01',
      lease_term_months: '12'
    },
    content: '<h1>RESIDENTIAL LEASE AGREEMENT</h1><p>This Lease Agreement is made between Sarah Johnson and John Smith...</p>',
    status: 'signed',
    version: 1,
    createdAt: '2024-11-15T10:30:00Z',
    updatedAt: '2024-11-20T14:45:00Z',
    createdBy: 'agent1',
    reviewedBy: 'lawyer1',
    signedAt: '2024-11-20T15:00:00Z',
    expiresAt: '2025-12-01T00:00:00Z',
    attachments: [
      {
        id: 'att1',
        name: 'property_photos.pdf',
        type: 'application/pdf',
        size: 2048576,
        url: '/documents/property_photos.pdf',
        uploadedAt: '2024-11-15T10:35:00Z'
      }
    ]
  },
  {
    id: '2',
    templateId: '2',
    title: 'Pet Addendum - John Smith',
    propertyId: '1',
    parties: [
      {
        id: 'party1',
        name: 'John Smith',
        email: 'john.smith@email.com',
        role: 'tenant'
      }
    ],
    variables: {
      pet_type: 'Dog',
      pet_breed: 'Golden Retriever',
      pet_weight: 65,
      monthly_pet_fee: 50
    },
    content: '<h2>PET ADDENDUM</h2><p>This Pet Addendum is for Dog (Golden Retriever)...</p>',
    status: 'completed',
    version: 1,
    createdAt: '2024-11-16T09:20:00Z',
    updatedAt: '2024-11-16T09:20:00Z',
    createdBy: 'agent1',
    signedAt: '2024-11-16T11:30:00Z',
    attachments: []
  }
];

export const mockESignatureRequests: ESignatureRequest[] = [
  {
    id: '1',
    documentId: '1',
    partyId: 'party1',
    status: 'signed',
    sentAt: '2024-11-18T10:00:00Z',
    viewedAt: '2024-11-18T14:30:00Z',
    signedAt: '2024-11-20T15:00:00Z',
    expiresAt: '2024-12-18T10:00:00Z',
    reminderCount: 2,
    lastReminderAt: '2024-11-22T09:00:00Z'
  },
  {
    id: '2',
    documentId: '1',
    partyId: 'party2',
    status: 'signed',
    sentAt: '2024-11-18T10:00:00Z',
    viewedAt: '2024-11-19T11:15:00Z',
    signedAt: '2024-11-20T14:45:00Z',
    expiresAt: '2024-12-18T10:00:00Z',
    reminderCount: 1,
    lastReminderAt: '2024-11-21T10:30:00Z'
  }
];

export const mockDocumentCompliance: DocumentCompliance[] = [
  {
    documentId: '1',
    jurisdiction: 'California',
    requirements: [
      {
        id: 'req1',
        name: 'Security Deposit Limit',
        description: 'Security deposit cannot exceed 2 months rent',
        isMandatory: true,
        status: 'met',
        reference: 'California Civil Code §1950.5'
      },
      {
        id: 'req2',
        name: 'Lead Paint Disclosure',
        description: 'Required for properties built before 1978',
        isMandatory: true,
        status: 'met',
        reference: 'Federal Lead-Based Paint Disclosure Rule'
      },
      {
        id: 'req3',
        name: 'Rent Control Compliance',
        description: 'Must comply with local rent control ordinances',
        isMandatory: true,
        status: 'met',
        reference: 'San Francisco Rent Ordinance'
      }
    ],
    status: 'compliant',
    checkedAt: '2024-11-17T16:20:00Z',
    checkedBy: 'lawyer1',
    notes: 'Document meets all California and local requirements.',
    recommendedActions: []
  }
];

export const mockDocumentVersions: DocumentVersion[] = [
  {
    id: '1',
    documentId: '1',
    version: 1,
    content: 'Initial lease agreement draft',
    changes: 'Initial creation with standard terms',
    createdAt: '2024-11-15T10:30:00Z',
    createdBy: 'agent1',
    isCurrent: false
  },
  {
    id: '2',
    documentId: '1',
    version: 2,
    content: 'Updated lease with negotiated terms',
    changes: 'Modified rent amount and added pet clause',
    createdAt: '2024-11-18T14:15:00Z',
    createdBy: 'agent1',
    isCurrent: true
  }
];

export const mockDocumentAnalytics: DocumentAnalytics = {
  period: 'last_30_days',
  metrics: {
    documentsCreated: 47,
    documentsSigned: 42,
    averageCompletionTime: 48,
    signatureRate: 89.4,
    templateUsage: [
      {
        templateId: '1',
        usageCount: 28,
        completionRate: 92
      },
      {
        templateId: '2',
        usageCount: 12,
        completionRate: 85
      },
      {
        templateId: '3',
        usageCount: 7,
        completionRate: 100
      }
    ],
    commonCustomizations: [
      { variable: 'monthly_rent', frequency: 23 },
      { variable: 'lease_term_months', frequency: 18 },
      { variable: 'pet_type', frequency: 12 }
    ],
    complianceIssues: 2,
    legalReviewRequests: 8
  },
  trends: {
    documentVolume: 15.3,
    completionRate: 5.2,
    signatureSpeed: -8.7
  }
};

export const mockLegalReviews: LegalReview[] = [
  {
    id: '1',
    documentId: '1',
    reviewerId: 'lawyer1',
    status: 'approved',
    requestedAt: '2024-11-17T09:00:00Z',
    completedAt: '2024-11-17T16:30:00Z',
    comments: [
      {
        id: 'comment1',
        section: 'Security Deposit Clause',
        comment: 'Security deposit amount complies with California law',
        severity: 'info',
        createdAt: '2024-11-17T10:15:00Z'
      },
      {
        id: 'comment2',
        section: 'Termination Clause',
        comment: '30-day notice requirement is appropriate',
        severity: 'info',
        createdAt: '2024-11-17T11:30:00Z'
      }
    ],
    overallAssessment: 'Document is legally sound and compliant with California law.',
    riskLevel: 'low',
    recommendedChanges: []
  }
];

export const mockAdminUsers: AdminUser[] = [
  {
    id: 'admin1',
    name: 'Sarah Johnson',
    email: 'sarah@agently.com',
    role: 'super_admin',
    permissions: [
      { resource: '*', actions: ['manage'] }
    ],
    lastLogin: '2024-11-24T10:00:00Z',
    isActive: true,
    createdAt: '2024-01-15T09:00:00Z'
  },
  {
    id: 'admin2',
    name: 'Mike Chen',
    email: 'mike@agently.com',
    role: 'admin',
    permissions: [
      { resource: 'users', actions: ['create', 'read', 'update'] },
      { resource: 'properties', actions: ['read', 'update'] },
      { resource: 'analytics', actions: ['read'] }
    ],
    lastLogin: '2024-11-23T16:30:00Z',
    isActive: true,
    createdAt: '2024-03-20T10:00:00Z'
  }
];

export const mockPlatformAnalytics: PlatformAnalytics = {
  period: 'last_30_days',
  metrics: {
    totalUsers: 15420,
    activeUsers: 8920,
    newUsers: 1240,
    totalProperties: 3450,
    activeListings: 2890,
    totalTransactions: 5670,
    revenue: 2340000,
    conversionRate: 68.5
  },
  trends: {
    userGrowth: 15.3,
    propertyGrowth: 8.7,
    revenueGrowth: 22.4,
    engagementRate: 12.1
  },
  demographics: {
    userByRole: [
      { role: 'tenant', count: 8920 },
      { role: 'landlord', count: 3450 },
      { role: 'agent', count: 2340 },
      { role: 'vendor', count: 710 }
    ],
    userByLocation: [
      { location: 'California', count: 4520 },
      { location: 'New York', count: 3210 },
      { location: 'Texas', count: 2890 },
      { location: 'Florida', count: 1980 },
      { location: 'Other', count: 2820 }
    ],
    deviceTypes: [
      { device: 'Mobile', percentage: 65.4 },
      { device: 'Desktop', percentage: 28.7 },
      { device: 'Tablet', percentage: 5.9 }
    ]
  }
};

export const mockContentModeration: ContentModeration[] = [
  {
    id: '1',
    contentType: 'property',
    contentId: '1',
    reportedBy: 'user123',
    reason: 'Inaccurate property description',
    status: 'under_review',
    priority: 'medium',
    assignedTo: 'admin2',
    createdAt: '2024-11-20T14:30:00Z',
    notes: [
      {
        id: 'note1',
        author: 'admin2',
        note: 'Reviewing property photos and description for accuracy',
        createdAt: '2024-11-20T15:00:00Z'
      }
    ]
  },
  {
    id: '2',
    contentType: 'review',
    contentId: 'review45',
    reportedBy: 'user456',
    reason: 'Inappropriate language',
    status: 'pending',
    priority: 'high',
    createdAt: '2024-11-22T09:15:00Z',
    notes: []
  }
];

export const mockSystemConfiguration: SystemConfiguration[] = [
  {
    id: '1',
    category: 'platform',
    key: 'maintenance_mode',
    value: false,
    type: 'boolean',
    description: 'Enable maintenance mode for the platform',
    isPublic: false,
    lastModified: '2024-11-20T08:00:00Z',
    modifiedBy: 'admin1'
  },
  {
    id: '2',
    category: 'features',
    key: 'max_property_images',
    value: 20,
    type: 'number',
    description: 'Maximum number of images allowed per property',
    isPublic: true,
    lastModified: '2024-11-15T10:30:00Z',
    modifiedBy: 'admin1'
  },
  {
    id: '3',
    category: 'security',
    key: 'session_timeout',
    value: 3600,
    type: 'number',
    description: 'User session timeout in seconds',
    isPublic: false,
    lastModified: '2024-11-18T14:20:00Z',
    modifiedBy: 'admin2'
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    userId: 'admin1',
    action: 'user_suspended',
    resource: 'user',
    resourceId: 'user789',
    details: { reason: 'Violation of terms of service' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: '2024-11-23T16:45:00Z',
    severity: 'medium'
  },
  {
    id: '2',
    userId: 'admin2',
    action: 'property_approved',
    resource: 'property',
    resourceId: 'prop123',
    details: { previous_status: 'pending', new_status: 'approved' },
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    timestamp: '2024-11-23T14:20:00Z',
    severity: 'low'
  }
];

export const mockFinancialReports: FinancialReport[] = [
  {
    id: '1',
    period: 'November 2024',
    type: 'revenue',
    data: {
      totalAmount: 2340000,
      transactionCount: 5670,
      averageAmount: 412.70,
      breakdown: [
        { category: 'Property Commissions', amount: 1450000, percentage: 61.9 },
        { category: 'Service Fees', amount: 520000, percentage: 22.2 },
        { category: 'Premium Features', amount: 250000, percentage: 10.7 },
        { category: 'Other', amount: 120000, percentage: 5.2 }
      ]
    },
    generatedAt: '2024-12-01T00:00:00Z',
    generatedBy: 'admin1'
  }
];

export const mockNotificationTemplates: NotificationTemplate[] = [
  {
    id: '1',
    name: 'Lease Agreement Signed',
    type: 'email',
    category: 'transaction',
    subject: 'Your lease agreement has been signed',
    content: 'Dear {{tenant_name}},\n\nYour lease agreement for {{property_address}} has been successfully signed by all parties.\n\nBest regards,\nAgently Team',
    variables: ['tenant_name', 'property_address'],
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-11-01T14:30:00Z'
  },
  {
    id: '2',
    name: 'Maintenance Reminder',
    type: 'push',
    category: 'reminder',
    content: 'Don\'t forget your scheduled maintenance for {{property_address}} on {{scheduled_date}}',
    variables: ['property_address', 'scheduled_date'],
    isActive: true,
    createdAt: '2024-02-20T09:15:00Z',
    updatedAt: '2024-10-15T11:20:00Z'
  }
];

export const mockSupportTickets: SupportTicket[] = [
  {
    id: '1',
    userId: 'user123',
    subject: 'Unable to upload property photos',
    category: 'technical',
    priority: 'medium',
    status: 'in_progress',
    assignedTo: 'admin2',
    messages: [
      {
        id: 'msg1',
        authorId: 'user123',
        authorType: 'user',
        message: 'I\'m having trouble uploading photos to my property listing. The upload keeps failing.',
        attachments: [],
        createdAt: '2024-11-22T10:30:00Z',
        isInternal: false
      },
      {
        id: 'msg2',
        authorId: 'admin2',
        authorType: 'admin',
        message: 'I\'ve checked your account and it looks like there might be an issue with file size limits. Let me investigate further.',
        attachments: [],
        createdAt: '2024-11-22T11:15:00Z',
        isInternal: false
      }
    ],
    createdAt: '2024-11-22T10:30:00Z',
    updatedAt: '2024-11-22T11:15:00Z'
  }
];

export const mockFeatureFlags: FeatureFlag[] = [
  {
    id: '1',
    name: 'Advanced Property Search',
    description: 'Enhanced search with filters and AI recommendations',
    enabled: true,
    rolloutPercentage: 100,
    targetUsers: [],
    conditions: {},
    createdAt: '2024-10-01T09:00:00Z',
    updatedAt: '2024-11-15T14:20:00Z'
  },
  {
    id: '2',
    name: 'Virtual Tours Beta',
    description: '360-degree virtual property tours',
    enabled: true,
    rolloutPercentage: 25,
    targetUsers: ['premium_users'],
    conditions: { subscription_tier: 'premium' },
    createdAt: '2024-11-01T10:00:00Z',
    updatedAt: '2024-11-20T16:45:00Z'
  }
];

export const mockBackupStatus: BackupStatus[] = [
  {
    id: '1',
    type: 'database',
    status: 'completed',
    startedAt: '2024-11-24T02:00:00Z',
    completedAt: '2024-11-24T02:15:00Z',
    size: 2147483648, // 2GB
    location: 's3://agently-backups/database/',
    retention: 30
  },
  {
    id: '2',
    type: 'files',
    status: 'completed',
    startedAt: '2024-11-24T02:30:00Z',
    completedAt: '2024-11-24T02:45:00Z',
    size: 5368709120, // 5GB
    location: 's3://agently-backups/files/',
    retention: 30
  }
];

export const mockSystemHealth: SystemHealth = {
  services: [
    {
      name: 'API Gateway',
      status: 'healthy',
      uptime: 99.9,
      responseTime: 45,
      lastChecked: '2024-11-24T10:00:00Z'
    },
    {
      name: 'Database',
      status: 'healthy',
      uptime: 99.95,
      responseTime: 12,
      lastChecked: '2024-11-24T10:00:00Z'
    },
    {
      name: 'File Storage',
      status: 'healthy',
      uptime: 99.8,
      responseTime: 78,
      lastChecked: '2024-11-24T10:00:00Z'
    },
    {
      name: 'Email Service',
      status: 'degraded',
      uptime: 97.2,
      responseTime: 234,
      lastChecked: '2024-11-24T10:00:00Z'
    }
  ],
  infrastructure: {
    cpu: 45.2,
    memory: 67.8,
    disk: 34.1,
    network: 23.5
  },
  alerts: [
    {
      id: '1',
      severity: 'warning',
      title: 'High Memory Usage',
      message: 'Server memory usage is above 70% threshold',
      service: 'Web Server',
      createdAt: '2024-11-24T08:30:00Z',
      acknowledged: true,
      acknowledgedBy: 'admin1',
      resolved: false
    },
    {
      id: '2',
      severity: 'info',
      title: 'Scheduled Maintenance',
      message: 'Database maintenance window scheduled for tonight',
      createdAt: '2024-11-23T15:00:00Z',
      acknowledged: false,
      resolved: false
    }
  ]
};

export const mockTestSuites: TestSuite[] = [
  {
    id: '1',
    name: 'Frontend Component Tests',
    description: 'Unit tests for React components and UI elements',
    type: 'unit',
    category: 'frontend',
    status: 'passed',
    totalTests: 245,
    passedTests: 238,
    failedTests: 5,
    skippedTests: 2,
    duration: 125000, // milliseconds
    coverage: 87.3,
    lastRun: '2024-11-24T09:30:00Z',
    nextScheduled: '2024-11-24T14:00:00Z',
    environment: 'staging',
    tags: ['frontend', 'components', 'ui']
  },
  {
    id: '2',
    name: 'API Integration Tests',
    description: 'End-to-end API testing with database interactions',
    type: 'integration',
    category: 'api',
    status: 'running',
    totalTests: 89,
    passedTests: 67,
    failedTests: 12,
    skippedTests: 10,
    duration: 89000,
    coverage: 92.1,
    lastRun: '2024-11-24T10:15:00Z',
    environment: 'staging',
    tags: ['api', 'integration', 'database']
  },
  {
    id: '3',
    name: 'E2E User Journey Tests',
    description: 'Complete user workflow testing from registration to booking',
    type: 'e2e',
    category: 'frontend',
    status: 'failed',
    totalTests: 34,
    passedTests: 28,
    failedTests: 6,
    skippedTests: 0,
    duration: 245000,
    lastRun: '2024-11-24T08:00:00Z',
    environment: 'staging',
    tags: ['e2e', 'user-journey', 'critical']
  },
  {
    id: '4',
    name: 'Performance Load Tests',
    description: 'Load testing under various user concurrency levels',
    type: 'performance',
    category: 'infrastructure',
    status: 'passed',
    totalTests: 12,
    passedTests: 10,
    failedTests: 2,
    skippedTests: 0,
    duration: 1800000, // 30 minutes
    lastRun: '2024-11-23T22:00:00Z',
    environment: 'production',
    tags: ['performance', 'load', 'infrastructure']
  },
  {
    id: '5',
    name: 'Accessibility Compliance',
    description: 'WCAG 2.1 AA compliance testing',
    type: 'accessibility',
    category: 'frontend',
    status: 'passed',
    totalTests: 156,
    passedTests: 148,
    failedTests: 8,
    skippedTests: 0,
    duration: 67000,
    lastRun: '2024-11-24T07:00:00Z',
    environment: 'staging',
    tags: ['accessibility', 'wcag', 'compliance']
  },
  {
    id: '6',
    name: 'Security Vulnerability Scan',
    description: 'Automated security testing and vulnerability assessment',
    type: 'security',
    category: 'infrastructure',
    status: 'completed',
    totalTests: 78,
    passedTests: 65,
    failedTests: 13,
    skippedTests: 0,
    duration: 156000,
    lastRun: '2024-11-24T06:00:00Z',
    environment: 'staging',
    tags: ['security', 'vulnerability', 'scan']
  }
];

export const mockTestCases: TestCase[] = [
  {
    id: '1',
    suiteId: '1',
    name: 'PropertyCard renders correctly',
    description: 'Verify PropertyCard component displays all required information',
    status: 'passed',
    priority: 'medium',
    type: 'ui',
    duration: 1250,
    steps: [
      {
        id: 'step1',
        description: 'Render PropertyCard with mock data',
        expectedResult: 'Component renders without errors',
        actualResult: 'Component rendered successfully',
        status: 'passed',
        duration: 450
      },
      {
        id: 'step2',
        description: 'Check all required elements are present',
        expectedResult: 'Image, title, price, and amenities displayed',
        actualResult: 'All elements present and styled correctly',
        status: 'passed',
        duration: 800
      }
    ],
    createdAt: '2024-11-20T10:00:00Z',
    updatedAt: '2024-11-24T09:30:00Z'
  },
  {
    id: '2',
    suiteId: '3',
    name: 'User registration to booking flow',
    description: 'Complete user journey from registration to property booking',
    status: 'failed',
    priority: 'high',
    type: 'functional',
    duration: 45200,
    errorMessage: 'Booking confirmation step failed - payment processing timeout',
    steps: [
      {
        id: 'step1',
        description: 'Navigate to registration page',
        expectedResult: 'Registration form loads',
        actualResult: 'Form loaded successfully',
        status: 'passed',
        duration: 2100
      },
      {
        id: 'step2',
        description: 'Submit registration form',
        expectedResult: 'User account created and redirected to dashboard',
        actualResult: 'Account created successfully',
        status: 'passed',
        duration: 3200
      },
      {
        id: 'step3',
        description: 'Search and select property',
        expectedResult: 'Property details page loads',
        actualResult: 'Property page loaded',
        status: 'passed',
        duration: 1800
      },
      {
        id: 'step4',
        description: 'Initiate booking process',
        expectedResult: 'Booking form appears',
        actualResult: 'Booking form displayed',
        status: 'passed',
        duration: 1200
      },
      {
        id: 'step5',
        description: 'Complete payment and booking',
        expectedResult: 'Booking confirmed and success message shown',
        actualResult: 'Payment processing failed with timeout error',
        status: 'failed',
        duration: 35000
      }
    ],
    createdAt: '2024-11-22T14:00:00Z',
    updatedAt: '2024-11-24T08:00:00Z'
  }
];

export const mockTestRuns: TestRun[] = [
  {
    id: '1',
    suiteId: '1',
    status: 'completed',
    triggeredBy: 'scheduled',
    triggerType: 'scheduled',
    environment: 'staging',
    branch: 'main',
    commit: 'a1b2c3d4e5f6',
    startTime: '2024-11-24T09:00:00Z',
    endTime: '2024-11-24T09:02:05Z',
    duration: 125000,
    totalTests: 245,
    passedTests: 238,
    failedTests: 5,
    skippedTests: 2,
    coverage: 87.3,
    artifacts: [
      {
        id: 'art1',
        name: 'test-results.xml',
        type: 'report',
        url: '/artifacts/test-results-2024-11-24.xml',
        size: 245760,
        createdAt: '2024-11-24T09:02:05Z'
      },
      {
        id: 'art2',
        name: 'coverage-report.html',
        type: 'report',
        url: '/artifacts/coverage-2024-11-24.html',
        size: 1843200,
        createdAt: '2024-11-24T09:02:05Z'
      }
    ]
  }
];

export const mockBugReports: BugReport[] = [
  {
    id: '1',
    title: 'Payment processing timeout on booking confirmation',
    description: 'Users experience timeout errors when completing property bookings, preventing successful transactions.',
    severity: 'high',
    priority: 'urgent',
    status: 'in_progress',
    type: 'bug',
    component: 'Payment Processing',
    assignee: 'dev-team-1',
    reporter: 'qa-team',
    environment: 'production',
    browser: 'Chrome 119.0',
    os: 'Windows 11',
    steps: [
      'Navigate to property booking page',
      'Fill out booking form with valid information',
      'Enter payment details',
      'Click "Complete Booking" button',
      'Wait for processing (times out after 30 seconds)'
    ],
    expectedResult: 'Booking completes successfully with confirmation',
    actualResult: 'Timeout error occurs, booking fails',
    attachments: ['/bugs/screenshot-timeout.png', '/bugs/error-log.txt'],
    testCaseId: '2',
    createdAt: '2024-11-24T08:15:00Z',
    updatedAt: '2024-11-24T09:45:00Z',
    comments: [
      {
        id: 'comment1',
        author: 'qa-team',
        comment: 'This is affecting approximately 15% of booking attempts in production.',
        createdAt: '2024-11-24T08:15:00Z'
      },
      {
        id: 'comment2',
        author: 'dev-team-1',
        comment: 'Investigating payment gateway integration. Appears to be a race condition in the webhook handling.',
        createdAt: '2024-11-24T09:00:00Z'
      }
    ]
  },
  {
    id: '2',
    title: 'Mobile navigation menu not responsive on iOS Safari',
    description: 'Navigation menu fails to collapse properly on iPhone devices running iOS Safari.',
    severity: 'medium',
    priority: 'high',
    status: 'open',
    type: 'bug',
    component: 'Frontend - Navigation',
    reporter: 'design-team',
    environment: 'staging',
    browser: 'Safari Mobile',
    os: 'iOS 17.1',
    steps: [
      'Open app on iPhone Safari',
      'Navigate to any page with navigation menu',
      'Attempt to open mobile menu',
      'Try to close mobile menu'
    ],
    expectedResult: 'Menu opens and closes smoothly',
    actualResult: 'Menu opens but close button is unresponsive',
    attachments: ['/bugs/ios-nav-bug.mp4'],
    createdAt: '2024-11-23T14:30:00Z',
    updatedAt: '2024-11-23T14:30:00Z',
    comments: []
  }
];

export const mockPerformanceTests: PerformanceTest[] = [
  {
    id: '1',
    name: 'Homepage Load Test - 1000 Concurrent Users',
    description: 'Load testing homepage under 1000 concurrent users for 5 minutes',
    type: 'load',
    targetUrl: 'https://agently.com/',
    concurrentUsers: 1000,
    duration: 5,
    rampUpTime: 60,
    status: 'completed',
    startTime: '2024-11-23T22:00:00Z',
    endTime: '2024-11-23T22:35:00Z',
    metrics: [
      {
        timestamp: '2024-11-23T22:05:00Z',
        responseTime: 245,
        throughput: 850,
        errorRate: 0.2,
        cpuUsage: 45.2,
        memoryUsage: 67.8,
        activeUsers: 500
      },
      {
        timestamp: '2024-11-23T22:10:00Z',
        responseTime: 312,
        throughput: 920,
        errorRate: 0.5,
        cpuUsage: 52.1,
        memoryUsage: 71.3,
        activeUsers: 750
      },
      {
        timestamp: '2024-11-23T22:15:00Z',
        responseTime: 389,
        throughput: 780,
        errorRate: 1.2,
        cpuUsage: 68.9,
        memoryUsage: 78.4,
        activeUsers: 1000
      }
    ],
    thresholds: [
      { metric: 'responseTime', operator: 'le', value: 500, status: 'pass' },
      { metric: 'errorRate', operator: 'le', value: 1.0, status: 'warning' },
      { metric: 'cpuUsage', operator: 'le', value: 80, status: 'pass' }
    ]
  }
];

export const mockAccessibilityTests: AccessibilityTest[] = [
  {
    id: '1',
    pageUrl: 'https://agently.com/properties',
    standard: 'WCAG2AA',
    status: 'completed',
    violations: [
      {
        id: 'color-contrast',
        impact: 'serious',
        description: 'Elements must have sufficient color contrast',
        help: 'Ensure the contrast ratio between text and background is at least 4.5:1',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/color-contrast',
        nodes: [
          {
            target: '.property-price',
            html: '<span class="property-price">$2,500/month</span>',
            failureSummary: 'Fix any of the following: Element has insufficient color contrast of 3.2:1'
          }
        ]
      },
      {
        id: 'image-alt',
        impact: 'critical',
        description: 'Images must have alternate text',
        help: 'Provide alternative text for images',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/image-alt',
        nodes: [
          {
            target: '.property-image',
            html: '<img src="property.jpg" class="property-image">',
            failureSummary: 'Fix any of the following: Element does not have an alt attribute'
          }
        ]
      }
    ],
    score: 78.5,
    testedAt: '2024-11-24T07:00:00Z',
    recommendations: [
      'Fix color contrast issues on price displays',
      'Add alt text to all property images',
      'Ensure form labels are properly associated',
      'Add ARIA labels to interactive elements'
    ]
  }
];

export const mockSecurityTests: SecurityTest[] = [
  {
    id: '1',
    name: 'Frontend Security Scan',
    type: 'dast',
    target: 'https://agently.com',
    status: 'completed',
    vulnerabilities: [
      {
        id: 'CVE-2024-1234',
        severity: 'high',
        title: 'Cross-Site Scripting (XSS) Vulnerability',
        description: 'Reflected XSS vulnerability in search parameter',
        cwe: 'CWE-79',
        cvss: 7.5,
        affectedComponent: 'Search Component',
        recommendation: 'Implement proper input sanitization and output encoding',
        status: 'in_progress'
      },
      {
        id: 'CVE-2024-5678',
        severity: 'medium',
        title: 'Missing Security Headers',
        description: 'Application missing security headers (CSP, HSTS)',
        cwe: 'CWE-693',
        cvss: 5.3,
        affectedComponent: 'Web Server Configuration',
        recommendation: 'Implement Content Security Policy and HSTS headers',
        status: 'open'
      }
    ],
    score: 82.3,
    testedAt: '2024-11-24T06:00:00Z'
  }
];

export const mockTestCoverage: TestCoverage[] = [
  {
    id: '1',
    component: 'PropertyCard',
    type: 'statement',
    coverage: 89.2,
    total: 145,
    covered: 129,
    missed: 16,
    lastUpdated: '2024-11-24T09:30:00Z'
  },
  {
    id: '2',
    component: 'UserAuthentication',
    type: 'branch',
    coverage: 76.8,
    total: 89,
    covered: 68,
    missed: 21,
    lastUpdated: '2024-11-24T09:30:00Z'
  },
  {
    id: '3',
    component: 'PaymentProcessing',
    type: 'function',
    coverage: 94.1,
    total: 52,
    covered: 49,
    missed: 3,
    lastUpdated: '2024-11-24T09:30:00Z'
  }
];

export const mockTestPipelines: TestPipeline[] = [
  {
    id: '1',
    name: 'Main Branch CI/CD Pipeline',
    description: 'Complete CI/CD pipeline for main branch deployments',
    stages: [
      {
        id: 'stage1',
        name: 'Build',
        type: 'build',
        status: 'passed',
        duration: 180000,
        logs: 'Build completed successfully in 3 minutes',
        artifacts: ['/artifacts/build-2024-11-24.zip']
      },
      {
        id: 'stage2',
        name: 'Unit Tests',
        type: 'test',
        status: 'passed',
        duration: 125000,
        logs: '245 tests passed, 5 failed, 2 skipped',
        artifacts: ['/artifacts/test-results.xml', '/artifacts/coverage.html']
      },
      {
        id: 'stage3',
        name: 'Integration Tests',
        type: 'test',
        status: 'running',
        duration: 89000,
        logs: 'Running API integration tests...',
        artifacts: []
      },
      {
        id: 'stage4',
        name: 'Security Scan',
        type: 'security',
        status: 'pending',
        logs: '',
        artifacts: []
      },
      {
        id: 'stage5',
        name: 'Deploy to Staging',
        type: 'deploy',
        status: 'pending',
        logs: '',
        artifacts: []
      }
    ],
    status: 'running',
    trigger: 'push',
    branch: 'main',
    commit: 'a1b2c3d4e5f6',
    startedAt: '2024-11-24T10:00:00Z',
    duration: 294000
  }
];
