import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface QueryBoundaryProps<T> {
  isLoading: boolean;
  error: unknown;
  data: T | undefined;
  isEmpty?: (data: T) => boolean;
  emptyState?: ReactNode;
  skeleton?: ReactNode;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
}

/**
 * Renders the loading / error / empty / success states for an async section.
 *
 * Every data-driven screen has the same four states; centralising them means a
 * screen can never silently ship a blank panel when a request fails.
 */
export function QueryBoundary<T>({
  isLoading,
  error,
  data,
  isEmpty,
  emptyState,
  skeleton,
  onRetry,
  children,
}: QueryBoundaryProps<T>) {
  if (isLoading) {
    return <>{skeleton ?? <Skeleton className="h-32 w-full" />}</>;
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <p className="font-medium">{messageFor(error)}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (data === undefined) return null;

  if (isEmpty?.(data)) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
        {emptyState ?? <p className="text-muted-foreground">Nothing to show yet.</p>}
      </div>
    );
  }

  return <>{children(data)}</>;
}

function messageFor(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong while loading this.';
}
