import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Maintenance from "./pages/Maintenance";
import Messages from "./pages/Messages";
import Roommates from "./pages/Roommates";
import Vendors from "./pages/Vendors";
import Insurance from "./pages/Insurance";
import Mortgage from "./pages/Mortgage";
import TenantPortal from "./pages/TenantPortal";
import LandlordPortal from "./pages/LandlordPortal";
import PropertyValuation from "./pages/PropertyValuation";
import NeighborhoodInsights from "./pages/NeighborhoodInsights";
import AuctionSystem from "./pages/AuctionSystem";
import AgentCRM from "./pages/AgentCRM";
import MaintenanceScheduling from "./pages/MaintenanceScheduling";
import DocumentTemplates from "./pages/DocumentTemplates";
import AdminPanel from "./pages/AdminPanel";
import Testing from "./pages/Testing";
import Auth from "./pages/Auth";
import About from "./pages/About";
import AdManagement from "./pages/AdManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/roommates" element={<Roommates />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/insurance" element={<Insurance />} />
              <Route path="/mortgage" element={<Mortgage />} />
              <Route path="/tenant" element={<TenantPortal />} />
              <Route path="/landlord" element={<LandlordPortal />} />
              <Route path="/valuation" element={<PropertyValuation />} />
              <Route path="/neighborhood" element={<NeighborhoodInsights />} />
              <Route path="/auctions" element={<AuctionSystem />} />
              <Route path="/agents" element={<AgentCRM />} />
              <Route path="/maintenance-scheduling" element={<MaintenanceScheduling />} />
              <Route path="/documents" element={<DocumentTemplates />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/testing" element={<Testing />} />
              <Route path="/about" element={<About />} />
              <Route path="/ad-management" element={<AdManagement />} />
            </Route>
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
