import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, FileText, MessageSquare, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSEO } from '@/lib/seo/useSEO';
import { formatDate, formatMoney } from '@/lib/format';
import { bookingKeys, maintenanceKeys } from '@/lib/query-keys';
import { bookingsApi, maintenanceApi } from '@/lib/api';

/** The tenant's home: their tenancy, rent, open repairs and agreements. */
export default function TenantPortal() {

  useSEO({ title: 'My tenancy', description: 'Your tenancy, rent and maintenance at a glance.', canonicalPath: '/tenant', noindex: true });

  const bookings = useQuery({
    queryKey: bookingKeys.all,
    queryFn: () => bookingsApi.list().then((r) => r.data),
  });

  const maintenance = useQuery({
    queryKey: maintenanceKeys.all,
    queryFn: () => maintenanceApi.list().then((r) => r.data),
  });

  const active = (bookings.data ?? []).find((booking) => booking.status === 'approved');
  const pending = (bookings.data ?? []).filter((booking) => booking.status === 'pending');
  const openRepairs = (maintenance.data ?? []).filter(
    (request) => request.status !== 'completed' && request.status !== 'cancelled'
  );

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My tenancy</h1>
        <p className="mt-1 text-muted-foreground">
          {active ? 'Everything about the home you are renting.' : 'Your rental activity in one place.'}
        </p>
      </header>

      {bookings.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : active ? (
        <Card className="mb-8 border-success/30 bg-success/5">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{active.property_title ?? 'Your home'}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {active.property_address ?? ''}
                </p>
              </div>
              <Badge className="bg-success text-success-foreground">Active tenancy</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Monthly rent</dt>
                <dd className="mt-1 text-lg font-semibold">
                  {formatMoney(active.monthly_rent, active.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Started</dt>
                <dd className="mt-1 font-medium">{formatDate(active.start_date)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Ends</dt>
                <dd className="mt-1 font-medium">
                  {active.end_date ? formatDate(active.end_date) : 'Rolling'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Landlord</dt>
                <dd className="mt-1 font-medium">{active.landlord_name ?? '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="font-medium">No active tenancy</p>
              <p className="text-sm text-muted-foreground">
                {pending.length > 0
                  ? `You have ${pending.length} request${pending.length === 1 ? '' : 's'} awaiting a decision.`
                  : 'When you sign for a home it will appear here.'}
              </p>
            </div>
            <Button asChild>
              <Link to="/properties">Find a home</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          to="/bookings"
          icon={CalendarDays}
          label="Booking requests"
          value={String((bookings.data ?? []).length)}
        />
        <SummaryCard
          to="/maintenance"
          icon={Wrench}
          label="Open repairs"
          value={String(openRepairs.length)}
        />
        <SummaryCard to="/documents" icon={FileText} label="Documents" value="Manage" />
        <SummaryCard to="/messages" icon={MessageSquare} label="Messages" value="Open" />
      </div>

      {openRepairs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Open repairs</h2>
          <ul className="space-y-3">
            {openRepairs.slice(0, 5).map((request) => (
              <li key={request.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium">{request.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Raised {formatDate(request.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{request.priority}</Badge>
                      <Badge variant="outline" className="capitalize">
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  to,
  icon: Icon,
  label,
  value,
}: {
  to: string;
  icon: typeof Wrench;
  label: string;
  value: string;
}) {
  return (
    <Button variant="outline" className="h-auto justify-start gap-3 p-5" asChild>
      <Link to={to}>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-left">
          <span className="block text-sm text-muted-foreground">{label}</span>
          <span className="block font-semibold">{value}</span>
        </span>
      </Link>
    </Button>
  );
}
