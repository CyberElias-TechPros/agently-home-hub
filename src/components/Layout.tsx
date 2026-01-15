import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, Search, User, MessageSquare, Settings, Menu, Building2, FileText, Wrench, Users, Briefcase, Shield, Calculator, Building, TrendingUp, MapPin, Gavel, Award, Calendar, ShieldCheck, BarChart3, ChevronDown, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Categorized navigation structure with dropdown menus - Agently Real-Estate OS
  const navCategories = [
    {
      label: 'Discover',
      items: [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/properties', icon: Search, label: 'Browse Properties' },
        { path: '/neighborhood', icon: MapPin, label: 'Neighborhood Insights' },
        { path: '/valuation', icon: TrendingUp, label: 'Property Valuation' },
      ]
    },
    {
      label: 'For Tenants',
      items: [
        { path: '/dashboard', icon: User, label: 'Dashboard' },
        { path: '/roommates', icon: Users, label: 'Roommate Matching' },
        { path: '/mortgage', icon: Calculator, label: 'Mortgage Calculator' },
        { path: '/insurance', icon: ShieldCheck, label: 'Insurance' },
      ]
    },
    {
      label: 'For Landlords',
      items: [
        { path: '/landlord', icon: Building, label: 'Landlord Portal' },
        { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
        { path: '/maintenance-scheduling', icon: Calendar, label: 'Scheduling' },
        { path: '/auctions', icon: Gavel, label: 'Auctions' },
      ]
    },
    {
      label: 'For Agents',
      items: [
        { path: '/agents', icon: Award, label: 'Agent CRM' },
        { path: '/vendors', icon: Briefcase, label: 'Vendor Marketplace' },
        { path: '/documents', icon: FileText, label: 'Document Templates' },
      ]
    },
    {
      label: 'Platform',
      items: [
        { path: '/bookings', icon: Calendar, label: 'Bookings' },
        { path: '/messages', icon: MessageSquare, label: 'Messages' },
        { path: '/admin', icon: Shield, label: 'Admin Panel' },
        { path: '/testing', icon: BarChart3, label: 'Testing & QA' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                Agently
              </span>
            </Link>

            {/* Desktop Navigation - Categorized Dropdown Menus */}
            <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto max-w-2xl">
              {navCategories.map((category) => (
                <DropdownMenu key={category.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 whitespace-nowrap hover:bg-primary/10"
                    >
                      <span className="hidden xl:inline">{category.label}</span>
                      <span className="xl:hidden">{category.label.slice(0, 4)}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-56"
                    sideOffset={5}
                  >
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <DropdownMenuItem key={item.path} asChild>
                          <Link
                            to={item.path}
                            className={cn(
                              "flex items-center gap-2 w-full cursor-pointer rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                              isActive && "bg-primary/10 text-primary font-medium"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
              {/* About Link */}
              <Link to="/about">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap hover:bg-primary/10"
                >
                  About
                </Button>
              </Link>
            </nav>

            {/* User Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile/Tablet Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <div className="flex flex-col space-y-4 mt-8">
                    <div className="px-2">
                      <h2 className="text-lg font-semibold mb-4">Navigation</h2>
                      <div className="space-y-4">
                        {navCategories.map((category) => (
                          <div key={category.label}>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                              {category.label}
                            </h3>
                            <div className="space-y-1 ml-2">
                              {category.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                  <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                      "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                                      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                    )}
                                  >
                                    <Icon className="h-4 w-4" />
                                    <span className="text-sm">{item.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {/* About Link */}
                        <div className="px-2">
                          <Link
                            to="/about"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted"
                          >
                            <span className="text-sm">About</span>
                          </Link>
                        </div>
                       </div>
                     </div>
                   </div>
                 </SheetContent>
               </Sheet>

              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user.name}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" className="hidden sm:inline-flex">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-background via-background/50 to-background border-t border-border/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  Agently
                </span>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md">
                A world-class digital real-estate operating system that unifies property discovery,
                rental payments, landlord & tenant management, agent professionalism, legal protection,
                fintech, and trust infrastructure into one elegant platform.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  AI-Powered
                </span>
                <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium">
                  Trust-First
                </span>
                <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Category-Defining
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">For Tenants</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/properties" className="hover:text-primary transition-colors">Browse Properties</Link></li>
                <li><Link to="/roommates" className="hover:text-primary transition-colors">Roommate Matching</Link></li>
                <li><Link to="/mortgage" className="hover:text-primary transition-colors">Mortgage Calculator</Link></li>
                <li><Link to="/insurance" className="hover:text-primary transition-colors">Insurance</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">For Landlords</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/landlord" className="hover:text-primary transition-colors">Landlord Portal</Link></li>
                <li><Link to="/maintenance" className="hover:text-primary transition-colors">Maintenance</Link></li>
                <li><Link to="/auctions" className="hover:text-primary transition-colors">Auctions</Link></li>
                <li><Link to="/valuation" className="hover:text-primary transition-colors">Property Valuation</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © 2025 Agently. All rights reserved. Built for the future of real estate.
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
