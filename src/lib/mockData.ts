import { Property, Booking, MaintenanceRequest, User } from '@/types';

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
