// API service layer for production-ready data fetching
import { Property, Booking, MaintenanceRequest, Message, User } from '@/types';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private static instance: ApiService;
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Properties API
  async getProperties(filters?: {
    search?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Property[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());

    const query = params.toString();
    return this.request<Property[]>(`/properties${query ? `?${query}` : ''}`);
  }

  async getProperty(id: string): Promise<Property> {
    return this.request<Property>(`/properties/${id}`);
  }

  async createProperty(property: Omit<Property, 'id'>): Promise<Property> {
    return this.request<Property>('/properties', {
      method: 'POST',
      body: JSON.stringify(property),
    });
  }

  async updateProperty(id: string, property: Partial<Property>): Promise<Property> {
    return this.request<Property>(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(property),
    });
  }

  async deleteProperty(id: string): Promise<void> {
    return this.request<void>(`/properties/${id}`, {
      method: 'DELETE',
    });
  }

  // Bookings API
  async getBookings(): Promise<Booking[]> {
    return this.request<Booking[]>('/bookings');
  }

  async createBooking(booking: Omit<Booking, 'id'>): Promise<Booking> {
    return this.request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  async updateBooking(id: string, booking: Partial<Booking>): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(booking),
    });
  }

  // Maintenance API
  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    return this.request<MaintenanceRequest[]>('/maintenance');
  }

  async createMaintenanceRequest(request: Omit<MaintenanceRequest, 'id'>): Promise<MaintenanceRequest> {
    return this.request<MaintenanceRequest>('/maintenance', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateMaintenanceRequest(id: string, request: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> {
    return this.request<MaintenanceRequest>(`/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  // Messages API
  async getMessages(): Promise<Message[]> {
    return this.request<Message[]>('/messages');
  }

  async sendMessage(message: Omit<Message, 'id'>): Promise<Message> {
    return this.request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  // User API
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateProfile(user: Partial<User>): Promise<User> {
    return this.request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }
}

// Mock API service that falls back to mock data when API is not available
class MockApiService extends ApiService {
  async getProperties(filters?: any): Promise<Property[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Import mock data dynamically to avoid circular imports
    const { mockProperties } = await import('./mockData');

    let filtered = [...mockProperties];

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.location.city.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.type && filters.type !== 'all') {
      filtered = filtered.filter(p => p.type === filters.type);
    }

    if (filters?.minPrice || filters?.maxPrice) {
      filtered = filtered.filter(p =>
        p.price >= (filters.minPrice || 0) &&
        p.price <= (filters.maxPrice || Infinity)
      );
    }

    return filtered;
  }

  async getProperty(id: string): Promise<Property> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const { mockProperties } = await import('./mockData');
    const property = mockProperties.find(p => p.id === id);
    if (!property) throw new Error('Property not found');
    return property;
  }

  async getBookings(): Promise<Booking[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const { mockBookings } = await import('./mockData');
    return mockBookings;
  }

  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const { mockMaintenanceRequests } = await import('./mockData');
    return mockMaintenanceRequests;
  }

  async getMessages(): Promise<Message[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Return empty array for now
    return [];
  }

  async getCurrentUser(): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const { mockUser } = await import('./mockData');
    return mockUser;
  }
}

// Use mock service in development, real API in production
export const apiService = import.meta.env.DEV
  ? new MockApiService()
  : ApiService.getInstance();