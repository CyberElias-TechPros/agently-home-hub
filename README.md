# Agently - Comprehensive Real Estate Platform

Agently is a modern, full-featured real estate platform built for the Nigerian market, providing a complete ecosystem for property rentals, roommate matching, vendor services, insurance, mortgage calculations, and more.

## 🚀 Features

### Core Platform
- **Property Listings**: Advanced search and filtering for rental properties
- **User Authentication**: Secure login/registration with role-based access
- **Dashboard**: Personalized dashboard for tenants, landlords, and managers
- **Booking System**: Seamless property booking and management

### Advanced Modules
- **Roommate Matching**: AI-powered roommate compatibility matching
- **Vendor Marketplace**: Connect with verified service providers
- **Insurance Integration**: Comprehensive property insurance management
- **Mortgage Calculator**: Advanced mortgage and affordability calculations
- **Virtual Tours**: 360-degree property tours and VR support
- **Tenant Portal**: Complete tenant management interface
- **Landlord Portal**: Property management tools for landlords
- **Property Valuation**: Automated valuation and market analysis
- **Neighborhood Insights**: Safety scores, school ratings, amenities mapping
- **Auction System**: Live property auctions with bidding
- **Agent CRM**: Lead management and client tracking
- **Maintenance Scheduling**: Automated maintenance coordination
- **Document Templates**: Legal document generation and management
- **Admin Panel**: Comprehensive system administration

### Technical Features
- **Real-time Messaging**: Instant communication between users
- **Push Notifications**: Mobile and web notifications
- **Multi-language Support**: Internationalization ready
- **Mobile Responsive**: Optimized for all devices
- **Offline Support**: PWA capabilities
- **Performance Optimized**: Code splitting and lazy loading

## 🛠️ Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand (planned)
- **Routing**: React Router v6
- **API**: RESTful API with React Query
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Handling**: date-fns

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agently-home-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Custom components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and services
│   ├── api.ts          # API service layer
│   ├── auth.ts         # Authentication service
│   ├── mockData.ts     # Mock data for development
│   └── utils.ts        # Utility functions
├── types/              # TypeScript type definitions
└── assets/             # Static assets
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_API_URL=http://localhost:3001/api
```

## 🚀 Deployment

The application is configured for deployment on Vercel, Netlify, or any static hosting service.

### Build Optimization

- Code splitting for better performance
- Image optimization
- CSS minification
- Service worker for caching

## 📱 Mobile Support

The platform is fully responsive and includes:
- Touch-friendly interfaces
- Mobile-optimized navigation
- PWA capabilities for offline use
- Push notifications

## 🔒 Security

- JWT-based authentication
- Input validation with Zod
- XSS protection
- CSRF protection
- Secure API endpoints

## 🧪 Testing

The platform includes comprehensive testing:
- Unit tests with Jest
- Integration tests
- E2E tests with Playwright
- Accessibility testing
- Performance testing

## 📈 Performance

- Lazy loading of components
- Image optimization
- Bundle analysis and optimization
- CDN-ready asset management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support or questions, please contact the development team or create an issue in the repository.
