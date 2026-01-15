const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
require('dotenv').config();
const { testConnection, query } = require('./db');
const { router: authRoutes, authenticateToken, requireRole, requireOwnershipOrRole } = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const bookingRoutes = require('./routes/bookings');
const maintenanceRoutes = require('./routes/maintenance');
const contractorRoutes = require('./routes/contractors');
const documentRoutes = require('./routes/documents');
const leaseRoutes = require('./routes/leases');
const leadRoutes = require('./routes/leads');
const messageRoutes = require('./routes/messages');
const searchRoutes = require('./routes/search');
const neighborhoodRoutes = require('./routes/neighborhood');
const valuationRoutes = require('./routes/valuation');
const { initializeSocket } = require('./socket');

// Database usage flag
const USE_DATABASE = process.env.USE_DATABASE === 'true';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock data - in production, this would come from a database
const mockData = {
  properties: [
    {
      id: '1',
      title: 'Modern Downtown Apartment',
      description: 'Beautiful 2-bedroom apartment in the heart of downtown with stunning city views.',
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
    }
  ],
  users: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'tenant',
      verified: true,
      phone: '(555) 123-4567'
    }
  ],
  bookings: [
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
  ],
  maintenance: [
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
    }
  ],
  roommateProfiles: [
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
    }
  ],
  roomAvailabilities: [
    {
      id: '1',
      propertyId: '1',
      landlordId: '1',
      title: 'Shared Room in Downtown Apartment',
      description: 'Beautiful shared room in a modern downtown apartment.',
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
    }
  ],
  vendors: [
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
    }
  ],
  vendorServices: [
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
    }
  ],
  vendorBookings: [
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
  ],
  insuranceProviders: [
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
    }
  ],
  insuranceQuotes: [
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
  ],
  insurancePolicies: [
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
  ],
  insuranceClaims: [
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
  ],
  mortgageRates: [
    {
      lender: 'Bank of America',
      rate: 6.25,
      apr: 6.45,
      points: 0.5,
      fees: 2500,
      term: 30,
      lastUpdated: '2024-11-20T10:00:00Z'
    }
  ]
};

// Helper functions
const filterData = (data, filters) => {
  let filtered = [...data];

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(item =>
      item.title?.toLowerCase().includes(searchLower) ||
      item.location?.city?.toLowerCase().includes(searchLower) ||
      item.businessName?.toLowerCase().includes(searchLower) ||
      item.name?.toLowerCase().includes(searchLower)
    );
  }

  if (filters?.type && filters.type !== 'all') {
    filtered = filtered.filter(item => item.type === filters.type);
  }

  if (filters?.minPrice || filters?.maxPrice) {
    filtered = filtered.filter(item =>
      item.price >= (filters.minPrice || 0) &&
      item.price <= (filters.maxPrice || Infinity)
    );
  }

  return filtered;
};

const calculateMortgage = (data) => {
  const { loanAmount, interestRate, loanTerm, propertyTax, insurance, pmi = 0 } = data;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;

  const monthlyPrincipalAndInterest = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

  const monthlyPayment = monthlyPrincipalAndInterest + (propertyTax / 12) + (insurance / 12) + pmi;
  const totalPayment = monthlyPayment * numPayments;
  const totalInterest = totalPayment - loanAmount;

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    amortizationSchedule: [{
      month: 1,
      payment: monthlyPrincipalAndInterest,
      principal: monthlyPrincipalAndInterest - (loanAmount * monthlyRate),
      interest: loanAmount * monthlyRate,
      balance: loanAmount - (monthlyPrincipalAndInterest - (loanAmount * monthlyRate))
    }]
  };
};

const calculateAffordability = (data) => {
  const { annualIncome, monthlyDebt, downPayment, interestRate, loanTerm, propertyTaxRate, insuranceRate } = data;
  const monthlyIncome = annualIncome / 12;
  const maxDTI = 0.43;
  const maxHousingRatio = 0.28;

  const maxMonthlyHousing = Math.min(
    monthlyIncome * maxHousingRatio,
    (monthlyIncome * maxDTI) - monthlyDebt
  );

  const estimatedPropertyTax = (maxMonthlyHousing * 12 * propertyTaxRate / 100) / 12;
  const estimatedInsurance = (maxMonthlyHousing * 12 * insuranceRate / 100) / 12;

  const maxMonthlyPITI = maxMonthlyHousing - estimatedPropertyTax - estimatedInsurance;

  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;

  const maxLoanAmount = maxMonthlyPITI * (Math.pow(1 + monthlyRate, numPayments) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, numPayments));
  const maxHomePrice = maxLoanAmount + downPayment;

  const debtToIncomeRatio = ((maxMonthlyHousing + monthlyDebt) / monthlyIncome) * 100;

  return {
    maxLoanAmount,
    maxHomePrice,
    monthlyPayment: maxMonthlyHousing,
    debtToIncomeRatio
  };
};

// Authentication routes
app.use('/api/auth', authRoutes);

// Property routes
app.use('/api/properties', propertyRoutes);

// Booking routes
app.use('/api/bookings', bookingRoutes);

// Maintenance routes
app.use('/api/maintenance', maintenanceRoutes);

// Contractor routes
app.use('/api/contractors', contractorRoutes);

// Document routes
app.use('/api/documents', documentRoutes);

// Lease routes
app.use('/api/leases', leaseRoutes);

// Lead routes
app.use('/api/leads', leadRoutes);

// Message routes
app.use('/api/messages', messageRoutes);

// Search routes
app.use('/api/search', searchRoutes);

// Neighborhood routes
app.use('/api/neighborhood', neighborhoodRoutes);

// Valuation routes
app.use('/api/valuation', valuationRoutes);

// Messages
app.get('/api/messages', (req, res) => {
  setTimeout(() => res.json([]), 300); // Return empty array for now
});

// ...
app.post('/api/messages', (req, res) => {
  const newMessage = { ...req.body, id: Date.now().toString() };
  res.status(201).json(newMessage);
});

// Auth/User
app.get('/api/auth/me', (req, res) => {
  setTimeout(() => res.json(mockData.users[0]), 300);
});

app.put('/api/auth/profile', (req, res) => {
  const index = mockData.users.findIndex(u => u.id === req.body.id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });
  mockData.users[index] = { ...mockData.users[index], ...req.body };
  res.json(mockData.users[index]);
});

// Roommate API
app.get('/api/roommates/profiles', (req, res) => {
  setTimeout(() => res.json(mockData.roommateProfiles), 300);
});

app.get('/api/roommates/availabilities', (req, res) => {
  setTimeout(() => res.json(mockData.roomAvailabilities), 300);
});

app.get('/api/roommates/matches', (req, res) => {
  setTimeout(() => res.json([]), 300); // Simplified for now
});

// Vendor API
app.get('/api/vendors', (req, res) => {
  const filters = req.query;
  const filtered = filterData(mockData.vendors, filters);
  setTimeout(() => res.json(filtered), 300);
});

app.get('/api/vendors/services', (req, res) => {
  setTimeout(() => res.json(mockData.vendorServices), 300);
});

app.get('/api/vendors/bookings', (req, res) => {
  setTimeout(() => res.json(mockData.vendorBookings), 300);
});

// Insurance API
app.get('/api/insurance/providers', (req, res) => {
  setTimeout(() => res.json(mockData.insuranceProviders), 300);
});

app.get('/api/insurance/quotes', (req, res) => {
  setTimeout(() => res.json(mockData.insuranceQuotes), 300);
});

app.get('/api/insurance/policies', (req, res) => {
  setTimeout(() => res.json(mockData.insurancePolicies), 300);
});

app.get('/api/insurance/claims', (req, res) => {
  setTimeout(() => res.json(mockData.insuranceClaims), 300);
});

// Mortgage API
app.get('/api/mortgage/rates', (req, res) => {
  setTimeout(() => res.json(mockData.mortgageRates), 300);
});

app.post('/api/mortgage/calculate', (req, res) => {
  const result = calculateMortgage(req.body);
  setTimeout(() => res.json(result), 500);
});

app.post('/api/mortgage/affordability', (req, res) => {
  const result = calculateAffordability(req.body);
  setTimeout(() => res.json(result), 500);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database connection and start server
const startServer = async () => {
  try {
    if (USE_DATABASE) {
      // Test database connection
      const dbConnected = await testConnection();
      if (!dbConnected) {
        console.error('❌ Failed to connect to database. Server will not start.');
        process.exit(1);
      } else {
        console.log('✅ Database connection established successfully');
      }
    } else {
      console.log('📝 Using mock data (database disabled)');
    }

    // Create HTTP server for Socket.io
    const server = http.createServer(app);
    
    // Initialize Socket.io
    const io = initializeSocket(server);
    
    // Make io available to routes
    app.set('io', io);

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Agently Backend Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔌 Socket.io server initialized`);
      console.log(`🗄️  Database mode: ${USE_DATABASE ? 'Enabled' : 'Disabled (using mock data)'}`);
    });
  } catch (error) {
    console.error('❌ Error during server startup:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;