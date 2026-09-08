import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/lib/api/types';

interface Props {
  roles?: UserRole[];
  children?: React.ReactNode;
}

/**
 * Route guard.
 *
 * Authorisation is enforced by the API on every request; this guard exists so
 * users are not shown a page that can only fail. Redirecting preserves the
 * attempted location so signing in returns you where you were going.
 */
export function RequireAuth({ roles, children }: Props) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
