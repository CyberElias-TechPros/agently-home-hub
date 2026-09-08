import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useSEO } from '@/lib/seo/useSEO';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { bookingKeys } from '@/lib/query-keys';
import { bookingsApi } from '@/lib/api';
import type { Booking, BookingStatus } from '@/lib/api/types';

const STATUSES: Array<BookingStatus | 'all'> = ['all', 'pending', 'approved', 'rejected', 'cancelled', 'completed'];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning/10 text-warning-foreground border-warning/30',
  approved: 'bg-success/10 text-success-foreground border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground',
  completed: 'bg-muted text-muted-foreground',
};

export default function Bookings() {
  useSEO({ title: 'Bookings', description: 'Your viewing and tenancy requests.', canonicalPath: '/bookings', noindex: true });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [decisionTarget, setDecisionTarget] = useState<{ booking: Booking; decision: 'approved' | 'rejected' } | null>(
    null
  );
  const [reason, setReason] = useState('');

  const bookings = useQuery({
    queryKey: bookingKeys.all,
    queryFn: () => bookingsApi.list().then((r) => r.data),
  });

  const decide = useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: 'approved' | 'rejected'; reason?: string }) =>
      bookingsApi.decide(id, decision, reason),
    onSuccess: () => {
      toast({ title: 'Booking updated' });
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      setDecisionTarget(null);
      setReason('');
    },
    onError: (error: Error) =>
      toast({ title: 'Could not update booking', description: error.message, variant: 'destructive' }),
  });

  const visible = (bookings.data ?? []).filter(
    (booking) => filter === 'all' || booking.status === filter
  );

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="mt-1 text-muted-foreground">
          {user?.role === 'tenant'
            ? 'Requests you have sent to landlords and agents.'
            : 'Requests from tenants on your listings.'}
        </p>
      </header>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as BookingStatus | 'all')}>
        <TabsList className="mb-6 flex-wrap">
          {STATUSES.map((status) => (
            <TabsTrigger key={status} value={status} className="capitalize">
              {status === 'all' ? 'All' : status}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {bookings.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : bookings.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">
          We could not load your bookings. Please try again.
        </p>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium">No bookings here</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.role === 'tenant'
              ? 'When you request a property it will show up here.'
              : 'Requests from tenants will appear here.'}
          </p>
          {user?.role === 'tenant' && (
            <Button className="mt-6" asChild>
              <Link to="/properties">Browse properties</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((booking) => {
            const isIncoming = booking.landlord_id === user?.id;
            const canDecide = isIncoming && booking.status === 'pending';

            return (
              <li key={booking.id}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg">
                          <Link
                            to={`/properties/${booking.property_id}`}
                            className="hover:underline"
                          >
                            {booking.property_title ?? 'Property'}
                          </Link>
                        </CardTitle>
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {booking.property_address ?? 'Address unavailable'}
                        </p>
                      </div>
                      <Badge variant="outline" className={`capitalize ${STATUS_STYLES[booking.status] ?? ''}`}>
                        {booking.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <dl className="grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Move-in</dt>
                        <dd className="font-medium">{formatDate(booking.start_date)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Lease ends</dt>
                        <dd className="font-medium">{booking.end_date ? formatDate(booking.end_date) : 'Open-ended'}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Monthly rent</dt>
                        <dd className="font-medium">{formatMoney(booking.monthly_rent, booking.currency)}</dd>
                      </div>
                    </dl>

                    {booking.message && (
                      <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                        “{booking.message}”
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {isIncoming
                          ? `Request from ${booking.tenant_name ?? 'a tenant'}`
                          : `With ${booking.landlord_name ?? 'the landlord'}`} ·{' '}
                        {formatDateTime(booking.created_at)}
                      </p>

                      {canDecide && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              decide.mutate({ id: booking.id, decision: 'approved' })
                            }
                            disabled={decide.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDecisionTarget({ booking, decision: 'rejected' })}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>

                    {booking.decision_reason && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Reason:</span> {booking.decision_reason}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={decisionTarget !== null} onOpenChange={(open) => !open && setDecisionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this request</DialogTitle>
            <DialogDescription>
              Let {decisionTarget?.booking.tenant_name ?? 'the tenant'} know why. They will see this
              reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Optional — e.g. the property has just been let."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={decide.isPending}
              onClick={() => {
                if (!decisionTarget) return;
                decide.mutate({
                  id: decisionTarget.booking.id,
                  decision: 'rejected',
                  reason: reason.trim() || undefined,
                });
              }}
            >
              Decline request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
