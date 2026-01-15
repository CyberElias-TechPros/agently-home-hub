import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
}

export function ResponsiveLayout({ 
  children, 
  className,
  mobile = false,
  tablet = false,
  desktop = false 
}: ResponsiveLayoutProps) {
  return (
    <div className={cn(
      'w-full',
      mobile && 'block sm:hidden',
      tablet && 'hidden sm:block lg:hidden',
      desktop && 'hidden lg:block',
      className
    )}>
      {children}
    </div>
  );
}

export function MobileOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ResponsiveLayout mobile className={className}>
      {children}
    </ResponsiveLayout>
  );
}

export function TabletOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ResponsiveLayout tablet className={className}>
      {children}
    </ResponsiveLayout>
  );
}

export function DesktopOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ResponsiveLayout desktop className={className}>
      {children}
    </ResponsiveLayout>
  );
}

export function ResponsiveGrid({ 
  children, 
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 }
}: {
  children: React.ReactNode;
  className?: string;
  cols?: { mobile?: number; tablet?: number; desktop?: number };
}) {
  return (
    <div className={cn(
      'grid gap-4',
      `grid-cols-${cols.mobile || 1}`,
      `sm:grid-cols-${cols.tablet || 2}`,
      `lg:grid-cols-${cols.desktop || 3}`,
      className
    )}>
      {children}
    </div>
  );
}

export function ResponsiveContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'container mx-auto px-4 sm:px-6 lg:px-8',
      className
    )}>
      {children}
    </div>
  );
}
