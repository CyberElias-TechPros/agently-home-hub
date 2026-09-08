import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { apiMocks } from '@/test/api-mock';
import { makeUser } from '@/test/factories';

vi.mock('@/lib/api', () => apiMocks);
vi.mock('@/hooks/use-auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: makeUser(),
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    hasRole: () => true,
  }),
}));

/**
 * Renders every screen once against empty API responses.
 *
 * The point is not to assert content but to prove each page mounts without
 * throwing — the failure mode a type checker cannot see (a hook order mistake,
 * an undefined destructure, a component used before it is defined).
 */
const PAGES: Array<[string, () => Promise<{ default: React.ComponentType }>, RegExp]> = [
  ['Home', () => import('./Home'), /Find a home you can/i],
  ['Properties', () => import('./Properties'), /Properties for rent/i],
  ['PropertyDetail', () => import('./PropertyDetail'), /not found|loading|property/i],
  ['Dashboard', () => import('./Dashboard'), /Welcome back/i],
  ['Bookings', () => import('./Bookings'), /Bookings/i],
  ['Maintenance', () => import('./Maintenance'), /Maintenance/i],
  ['Documents', () => import('./Documents'), /Documents/i],
  ['Messages', () => import('./Messages'), /Messages/i],
  ['Roommates', () => import('./Roommates'), /Roommate matching/i],
  ['Vendors', () => import('./Vendors'), /Service providers/i],
  ['Agents', () => import('./Agents'), /Agent CRM/i],
  ['LandlordPortal', () => import('./LandlordPortal'), /My properties/i],
  ['TenantPortal', () => import('./TenantPortal'), /My tenancy/i],
  ['AdminPanel', () => import('./AdminPanel'), /Administration/i],
  ['Settings', () => import('./Settings'), /Account settings/i],
  ['About', () => import('./About'), /Renting in Nigeria/i],
  ['Contact', () => import('./Contact'), /Contact us/i],
  ['NotFound', () => import('./NotFound'), /could not find that page/i],
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pages render without crashing', () => {
  it.each(PAGES)('%s mounts', async (_name, load, expected) => {
    const Page = (await load()).default;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <MemoryRouter>
            <Page />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });
});

describe('Legal', () => {
  it('renders the privacy policy', async () => {
    const Legal = (await import('./Legal')).default;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <MemoryRouter>
            <Legal doc="privacy" />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy policy');
    expect(screen.getByText(/What we collect/)).toBeInTheDocument();
  });

  it('renders the terms of service', async () => {
    const Legal = (await import('./Legal')).default;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <MemoryRouter>
            <Legal doc="terms" />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Terms of service');
  });
});
