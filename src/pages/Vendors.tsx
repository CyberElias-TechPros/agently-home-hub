import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSEO } from '@/lib/seo/useSEO';
import { formatMoney } from '@/lib/format';
import { vendorsApi } from '@/lib/api';
import type { Vendor } from '@/lib/api/types';

export default function Vendors() {
  useSEO({ title: 'Service providers', description: 'Find vetted tradespeople for your property.', canonicalPath: '/vendors', noindex: true });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [bookingTarget, setBookingTarget] = useState<Vendor | null>(null);
  const [bookingForm, setBookingForm] = useState({ description: '', scheduled_for: '' });

  const vendors = useQuery({
    queryKey: ['vendors', search],
    queryFn: () => vendorsApi.list({ q: search || undefined }).then((r) => r.data),
  });

  const bookings = useQuery({
    queryKey: ['vendors', 'bookings'],
    queryFn: () => vendorsApi.bookings().then((r) => r.data),
  });

  const book = useMutation({
    mutationFn: () =>
      vendorsApi.book({
        contractor_id: bookingTarget!.id,
        description: bookingForm.description,
        ...(bookingForm.scheduled_for ? { scheduled_for: bookingForm.scheduled_for } : {}),
      }),
    onSuccess: () => {
      toast({ title: 'Booking requested', description: `${bookingTarget?.business_name} has been notified.` });
      setBookingTarget(null);
      setBookingForm({ description: '', scheduled_for: '' });
      void queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error: Error) =>
      toast({ title: 'Could not request booking', description: error.message, variant: 'destructive' }),
  });

  const results = vendors.data ?? [];

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Service providers</h1>
        <p className="mt-1 text-muted-foreground">
          Vetted tradespeople for repairs, servicing and inspections.
        </p>
      </header>

      <Input
        type="search"
        aria-label="Search service providers"
        placeholder="Search by trade or business name…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="mb-6 max-w-md"
      />

      {vendors.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : vendors.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">
          We could not load service providers. Please try again.
        </p>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium">No providers found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? 'Try a different search term.' : 'Providers will appear here as they join.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((vendor) => (
            <Card key={vendor.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{vendor.business_name}</CardTitle>
                  {vendor.verified && (
                    <Badge className="bg-success/10 text-success-foreground">Verified</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                  <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({vendor.review_count})</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                {vendor.description && (
                  <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
                    {vendor.description}
                  </p>
                )}

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {vendor.categories.slice(0, 4).map((category) => (
                    <Badge key={category} variant="secondary" className="capitalize">
                      {category.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>

                {vendor.service_areas.length > 0 && (
                  <p className="mb-4 text-xs text-muted-foreground">
                    Serving {vendor.service_areas.slice(0, 3).join(', ')}
                  </p>
                )}

                <div className="mt-auto flex items-end justify-between gap-2">
                  <p className="text-sm">
                    {vendor.hourly_rate === null
                      ? 'Price on request'
                      : `${formatMoney(vendor.hourly_rate, vendor.currency)}/hr`}
                  </p>
                  <Button size="sm" onClick={() => setBookingTarget(vendor)}>
                    Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(bookings.data ?? []).length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Your bookings</h2>
          <ul className="space-y-3">
            {(bookings.data ?? []).map((booking) => (
              <li key={booking.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="truncate font-medium">{booking.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.scheduled_for ? `Scheduled ${booking.scheduled_for}` : 'Not yet scheduled'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {booking.quoted_amount !== null && (
                        <span className="text-sm font-medium">
                          {formatMoney(booking.quoted_amount, booking.currency)}
                        </span>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={bookingTarget !== null} onOpenChange={(open) => !open && setBookingTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {bookingTarget?.business_name}</DialogTitle>
            <DialogDescription>
              Describe the work you need done. They will confirm availability and price.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="vendor-description">What needs doing?</Label>
              <Textarea
                id="vendor-description"
                rows={4}
                className="mt-1.5"
                value={bookingForm.description}
                onChange={(event) =>
                  setBookingForm((form) => ({ ...form, description: event.target.value }))
                }
                placeholder="e.g. Replace the kitchen tap and check for leaks under the sink."
              />
            </div>
            <div>
              <Label htmlFor="vendor-schedule">Preferred date (optional)</Label>
              <Input
                id="vendor-schedule"
                type="date"
                className="mt-1.5"
                value={bookingForm.scheduled_for}
                onChange={(event) =>
                  setBookingForm((form) => ({ ...form, scheduled_for: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={book.isPending || bookingForm.description.trim().length < 5}
              onClick={() => book.mutate()}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
