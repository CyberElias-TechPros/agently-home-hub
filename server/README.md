# Agently Backend API Server

Express.js backend server for the Agently real estate platform, providing RESTful APIs for all frontend features.

## 🚀 Features

- **RESTful API** - Complete REST API endpoints
- **Mock Data** - Pre-populated mock data for development
- **CORS Support** - Cross-origin resource sharing
- **Security** - Helmet.js security middleware
- **Logging** - Morgan request logging
- **Environment Configuration** - dotenv support
- **Error Handling** - Comprehensive error handling
- **Health Checks** - API health monitoring

## 📦 Installation

```bash
cd server
npm install
```

## 🏃‍♂️ Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3001`

## 🔧 Configuration

Create a `.env` file in the server directory:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 📚 API Endpoints

### Properties
- `GET /api/properties` - Get all properties (with filtering)
- `GET /api/properties/:id` - Get property by ID
- `POST /api/properties` - Create new property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking

### Maintenance
- `GET /api/maintenance` - Get maintenance requests
- `POST /api/maintenance` - Create maintenance request
- `PUT /api/maintenance/:id` - Update maintenance request

### Messages
- `GET /api/messages` - Get messages
- `POST /api/messages` - Send message

### Authentication
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Roommate Matching
- `GET /api/roommates/profiles` - Get roommate profiles
- `GET /api/roommates/availabilities` - Get room availabilities
- `GET /api/roommates/matches` - Get roommate matches

### Vendor Marketplace
- `GET /api/vendors` - Get vendors (with filtering)
- `GET /api/vendors/services` - Get vendor services
- `GET /api/vendors/bookings` - Get vendor bookings

### Insurance Integration
- `GET /api/insurance/providers` - Get insurance providers
- `GET /api/insurance/quotes` - Get insurance quotes
- `GET /api/insurance/policies` - Get insurance policies
- `GET /api/insurance/claims` - Get insurance claims

### Mortgage Calculator
- `GET /api/mortgage/rates` - Get mortgage rates
- `POST /api/mortgage/calculate` - Calculate mortgage payment
- `POST /api/mortgage/affordability` - Calculate affordability

### Health Check
- `GET /api/health` - Server health check

## 🔍 API Filtering

Properties and vendors support filtering via query parameters:

```
GET /api/properties?search=downtown&type=apartment&minPrice=1000&maxPrice=3000
GET /api/vendors?search=plumbing
```

## 📊 Mock Data

The server includes comprehensive mock data for:
- Properties (apartments, houses, condos)
- Users (tenants, landlords, managers)
- Bookings and maintenance requests
- Roommate profiles and availabilities
- Vendors and their services
- Insurance providers and policies
- Mortgage rates and calculations

## 🧪 Testing

```bash
npm test
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-production-jwt-secret
ALLOWED_ORIGINS=https://yourdomain.com
```

### PM2 (Recommended for Production)
```bash
npm install -g pm2
pm2 start server.js --name "agently-backend"
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection
- **Input Validation** - Request validation
- **Rate Limiting** - (Can be added with express-rate-limit)
- **JWT Authentication** - Token-based auth ready

## 📝 Logging

All requests are logged using Morgan middleware with the 'combined' format.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For API documentation and support, check the frontend codebase or create an issue in the repository.