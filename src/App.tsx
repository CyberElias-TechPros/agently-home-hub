import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/use-auth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { RequireAuth } from '@/components/common/RequireAuth';
import { RouteFallback } from '@/components/common/RouteFallback';
import Layout from '@/components/Layout';

// Home is the landing page and the most likely entry point, so it stays in the
// main bundle. Everything else is split per route.
import Home from '@/pages/Home';

const Properties = lazy(() => import('@/pages/Properties'));
const PropertyDetail = lazy(() => import('@/pages/PropertyDetail'));
const Auth = lazy(() => import('@/pages/Auth'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Bookings = lazy(() => import('@/pages/Bookings'));
const Maintenance = lazy(() => import('@/pages/Maintenance'));
const Documents = lazy(() => import('@/pages/Documents'));
const Messages = lazy(() => import('@/pages/Messages'));
const Roommates = lazy(() => import('@/pages/Roommates'));
const Vendors = lazy(() => import('@/pages/Vendors'));
const Agents = lazy(() => import('@/pages/Agents'));
const LandlordPortal = lazy(() => import('@/pages/LandlordPortal'));
const TenantPortal = lazy(() => import('@/pages/TenantPortal'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const Settings = lazy(() => import('@/pages/Settings'));
const About = lazy(() => import('@/pages/About'));
const Legal = lazy(() => import('@/pages/Legal'));
const Contact = lazy(() => import('@/pages/Contact'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Data is re-fetched on focus so a returning tab does not show stale
      // bookings or maintenance requests; 30s keeps background traffic modest.
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
    mutations: { retry: 0 },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <Toaster />
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/properties" element={<Properties />} />
                  <Route path="/properties/:id" element={<PropertyDetail />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/privacy" element={<Legal doc="privacy" />} />
                  <Route path="/terms" element={<Legal doc="terms" />} />

                  <Route
                    path="/dashboard"
                    element={
                      <RequireAuth>
                        <Dashboard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <RequireAuth>
                        <Settings />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/bookings"
                    element={
                      <RequireAuth roles={['tenant', 'landlord', 'agent']}>
                        <Bookings />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/maintenance"
                    element={
                      <RequireAuth roles={['tenant', 'landlord', 'agent']}>
                        <Maintenance />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/documents"
                    element={
                      <RequireAuth>
                        <Documents />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/messages"
                    element={
                      <RequireAuth>
                        <Messages />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/roommates"
                    element={
                      <RequireAuth roles={['tenant']}>
                        <Roommates />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/vendors"
                    element={
                      <RequireAuth>
                        <Vendors />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/agents"
                    element={
                      <RequireAuth roles={['agent', 'admin']}>
                        <Agents />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/landlord"
                    element={
                      <RequireAuth roles={['landlord', 'agent']}>
                        <LandlordPortal />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/tenant"
                    element={
                      <RequireAuth roles={['tenant']}>
                        <TenantPortal />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <RequireAuth roles={['admin']}>
                        <AdminPanel />
                      </RequireAuth>
                    }
                  />
                </Route>

                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
