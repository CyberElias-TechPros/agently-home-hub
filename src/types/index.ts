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
}
