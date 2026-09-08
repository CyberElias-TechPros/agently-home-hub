import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Home,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Shield,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/api/types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  roles?: UserRole[];
  end?: boolean;
}

// Kept deliberately short. Every extra top-level entry competes for attention
// and makes the header unusable on tablets.
const NAV_ITEMS: NavItem[] = [
  { to: '/properties', label: 'Properties', icon: Search },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['tenant', 'landlord', 'agent', 'admin'] },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays, roles: ['tenant', 'landlord', 'agent'] },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['tenant', 'landlord', 'agent'] },
  { to: '/messages', label: 'Messages', icon: MessageSquare, roles: ['tenant', 'landlord', 'agent', 'admin'] },
  { to: '/documents', label: 'Documents', icon: FileText, roles: ['tenant', 'landlord', 'agent'] },
];

const ROLE_LINKS: Record<string, { to: string; label: string; icon: typeof Home }> = {
  tenant: { to: '/roommates', label: 'Roommates', icon: Users },
  landlord: { to: '/landlord', label: 'My properties', icon: Building2 },
  agent: { to: '/agents', label: 'CRM', icon: Briefcase },
  admin: { to: '/admin', label: 'Admin', icon: Shield },
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return user ? item.roles.includes(user.role) : false;
  });

  const roleLink = user ? ROLE_LINKS[user.role] : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Agently home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet text-sm font-bold text-white">
              A
            </span>
            <span className="text-lg font-bold tracking-tight">Agently</span>
          </Link>

          <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
            {roleLink && (
              <NavLink
                to={roleLink.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  )
                }
              >
                <roleLink.icon className="h-4 w-4" aria-hidden="true" />
                {roleLink.label}
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <NotificationCenter />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(user?.name ?? 'User')}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="truncate text-sm font-medium">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                      {user?.role && (
                        <p className="mt-1 text-xs capitalize text-muted-foreground">{user.role}</p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth?mode=register">Get started</Link>
                </Button>
              </div>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <nav aria-label="Mobile" className="mt-8 flex flex-col gap-1">
                  {visibleNav.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium',
                          isActive ? 'bg-muted' : 'hover:bg-muted/60'
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  ))}
                  {roleLink && (
                    <NavLink
                      to={roleLink.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted/60"
                    >
                      <roleLink.icon className="h-4 w-4" aria-hidden="true" />
                      {roleLink.label}
                    </NavLink>
                  )}
                  <NavLink
                    to="/about"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted/60"
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    About
                  </NavLink>
                </nav>

                {!isAuthenticated && (
                  <div className="mt-6 flex flex-col gap-2">
                    <Button asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/auth">Sign in</Link>
                    </Button>
                    <Button variant="outline" asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/auth?mode=register">Create account</Link>
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet text-sm font-bold text-white">
                A
              </span>
              <span className="text-lg font-bold">Agently</span>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Renting, managing and maintaining property in Nigeria — in one place. Verified
              listings, tracked maintenance and agreements you can rely on.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Product</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/properties" className="hover:text-foreground">Browse properties</Link></li>
              <li><Link to="/vendors" className="hover:text-foreground">Service providers</Link></li>
              <li><Link to="/about" className="hover:text-foreground">About Agently</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact us</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Legal</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground">Privacy policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground">Terms of service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t">
          <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Agently. All rights reserved.</p>
            <p>Built for the Nigerian rental market.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
