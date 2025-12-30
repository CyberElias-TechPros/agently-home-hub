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

  // Categorized navigation structure with dropdown menus
  const navCategories = [
    {
      label: 'Main',
      items: [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/properties', icon: Search, label: 'Browse Properties' },
        { path: '/dashboard', icon: User, label: 'Dashboard' },
      ]
    },
    {
      label: 'Property Management',
      items: [
        { path: '/tenant', icon: User, label: 'Tenant Portal' },
        { path: '/landlord', icon: Building, label: 'Landlord Portal' },
        { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
        { path: '/maintenance-scheduling', icon: Calendar, label: 'Scheduling' },
      ]
    },
    {
      label: 'Services',
      items: [
        { path: '/roommates', icon: Users, label: 'Roommate Matching' },
        { path: '/vendors', icon: Briefcase, label: 'Vendor Marketplace' },
        { path: '/insurance', icon: ShieldCheck, label: 'Insurance' },
        { path: '/mortgage', icon: Calculator, label: 'Mortgage Calculator' },
        { path: '/auctions', icon: Gavel, label: 'Auctions' },
      ]
    },
    {
      label: 'Tools & Insights',
      items: [
        { path: '/valuation', icon: TrendingUp, label: 'Property Valuation' },
        { path: '/neighborhood', icon: MapPin, label: 'Neighborhood Insights' },
        { path: '/agents', icon: Award, label: 'Agent CRM' },
        { path: '/documents', icon: FileText, label: 'Document Templates' },
      ]
    },
    {
      label: 'Management',
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

    </div>
  );
}
