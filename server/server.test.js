const request = require('supertest');
const app = require('./server');

describe('Agently Backend API', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/properties', () => {
    it('should return properties array', async () => {
      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter properties by search', async () => {
      const response = await request(app)
        .get('/api/properties?search=downtown')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return a specific property', async () => {
      const response = await request(app)
        .get('/api/properties/1')
        .expect(200);

      expect(response.body).toHaveProperty('id', '1');
      expect(response.body).toHaveProperty('title');
    });

    it('should return 404 for non-existent property', async () => {
      await request(app)
        .get('/api/properties/999')
        .expect(404);
    });
  });

  describe('POST /api/properties', () => {
    it('should create a new property', async () => {
      const newProperty = {
        title: 'Test Property',
        description: 'A test property',
        type: 'apartment',
        price: 2000,
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          coordinates: { lat: 0, lng: 0 }
        },
        images: [],
        bedrooms: 2,
        bathrooms: 1,
        area: 1000,
        amenities: ['Test'],
        status: 'available',
        landlordId: '1',
        availableFrom: '2024-12-01'
      };

      const response = await request(app)
        .post('/api/properties')
        .send(newProperty)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newProperty.title);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('email');
    });
  });

  describe('GET /api/vendors', () => {
    it('should return vendors array', async () => {
      const response = await request(app)
        .get('/api/vendors')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/insurance/providers', () => {
    it('should return insurance providers', async () => {
      const response = await request(app)
        .get('/api/insurance/providers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/mortgage/rates', () => {
    it('should return mortgage rates', async () => {
      const response = await request(app)
        .get('/api/mortgage/rates')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/mortgage/calculate', () => {
    it('should calculate mortgage payment', async () => {
      const mortgageData = {
        loanAmount: 300000,
        interestRate: 6.5,
        loanTerm: 30,
        propertyTax: 3600,
        insurance: 1200,
        pmi: 200
      };

      const response = await request(app)
        .post('/api/mortgage/calculate')
        .send(mortgageData)
        .expect(200);

      expect(response.body).toHaveProperty('monthlyPayment');
      expect(response.body).toHaveProperty('totalPayment');
      expect(response.body).toHaveProperty('totalInterest');
    });
  });

  describe('POST /api/mortgage/affordability', () => {
    it('should calculate affordability', async () => {
      const affordabilityData = {
        annualIncome: 80000,
        monthlyDebt: 800,
        downPayment: 60000,
        interestRate: 6.5,
        loanTerm: 30,
        propertyTaxRate: 1.2,
        insuranceRate: 0.4
      };

      const response = await request(app)
        .post('/api/mortgage/affordability')
        .send(affordabilityData)
        .expect(200);

      expect(response.body).toHaveProperty('maxLoanAmount');
      expect(response.body).toHaveProperty('maxHomePrice');
      expect(response.body).toHaveProperty('monthlyPayment');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
    });
  });
});