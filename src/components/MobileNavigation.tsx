import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Menu,
  Home,
  Search,
  Calendar,
  MessageSquare,
  Settings,
  User,
  Bell,
  LogOut,
  ChevronDown,
  ChevronRight,
  Map,
  BarChart3,
  FileText,
  Wrench,
  Users,
  Camera,
  Phone
} from 'lucide-react';

interface MobileNavigationProps {
  user?: any;
  notifications?: number;
  onNavigate?: (path: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  subItems?: NavItem[];
}

export default function MobileNavigation({ user, notifications = 0, onNavigate }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const navigationItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      href: '/dashboard'
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: <Map className="w-5 h-5" />,
      href: '/properties',
      subItems: [
        {
          id: 'search',
          label: 'Search',
          icon: <Search className="w-4 h-4" />,
          href: '/properties/search'
        },
        {
          id: 'map',
          label: 'Map View',
          icon: <Map className="w-4 h-4" />,
          href: '/properties/map'
        },
        {
          id: 'compare',
          label: 'Compare',
          icon: <BarChart3 className="w-4 h-4" />,
          href: '/properties/compare'
        }
      ]
    },
    {
      id: 'bookings',
      label: 'Bookings',
      icon: <Calendar className="w-5 h-5" />,
      href: '/bookings'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: <MessageSquare className="w-5 h-5" />,
      href: '/messages',
      badge: notifications
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: <Wrench className="w-5 h-5" />,
      href: '/maintenance'
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText className="w-5 h-5" />,
      href: '/documents'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      href: '/analytics'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      href: '/settings'
    }
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleNavigation = (href: string) => {
    setIsOpen(false);
    onNavigate?.(href);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasSubItems = item.subItems && item.subItems.length > 0;

    return (
      <div key={item.id}>
        <Button
          variant={level === 0 ? "ghost" : "ghost"}
          size={level === 0 ? "default" : "sm"}
          className={cn(
            "w-full justify-start gap-3",
            level > 0 && "ml-4 text-sm",
            level === 0 && "h-12"
          )}
          onClick={() => {
            if (hasSubItems) {
              toggleExpanded(item.id);
            } else {
              handleNavigation(item.href);
            }
          }}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <Badge variant="destructive" className="ml-auto">
              {item.badge}
            </Badge>
          )}
          {hasSubItems && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          )}
        </Button>
        
        {hasSubItems && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.subItems.map(subItem => renderNavItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          {notifications > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {notifications}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{user?.name || 'User'}</h3>
                <p className="text-sm text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
              </div>
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs"
                  >
                    {notifications}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {navigationItems.map(item => renderNavItem(item))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleNavigation('/profile')}
              >
                <User className="w-4 h-4" />
                Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleNavigation('/help')}
              >
                <Phone className="w-4 h-4" />
                Support
              </Button>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleNavigation('/logout')}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Mobile Bottom Navigation
export function MobileBottomNav({ currentPath = '/dashboard', onNavigate }: { currentPath?: string; onNavigate?: (path: string) => void }) {
  const bottomNavItems = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      href: '/dashboard'
    },
    {
      id: 'search',
      label: 'Search',
      icon: <Search className="w-5 h-5" />,
      href: '/properties/search'
    },
    {
      id: 'camera',
      label: 'Scan',
      icon: <Camera className="w-5 h-5" />,
      href: '/scan'
    },
    {
      id: 'messages',
      label: 'Chat',
      icon: <MessageSquare className="w-5 h-5" />,
      href: '/messages'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-5 h-5" />,
      href: '/profile'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-50">
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col gap-1 h-auto py-2 px-3 rounded-lg",
                isActive && "text-blue-600 bg-blue-50"
              )}
              onClick={() => onNavigate?.(item.href)}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
