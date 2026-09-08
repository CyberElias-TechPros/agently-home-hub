import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  FileText,
  MessageSquare,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useSEO } from '@/lib/seo/useSEO';
import { formatDate, formatMoney } from '@/lib/format';
import { profileApi } from '@/lib/api';

export default function Dashboard() {
  const { user } = useAuth();

  useSEO({ title: 'Dashboard', description: 'Your Agently overview.', canonicalPath: '/dashboard', noindex: true });

  const summary = useQuery({
    queryKey: ['profile', 'summary'],
    queryFn: () => profileApi.summary().then((r) => r.data),
  });

  const data = summary.data;

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Everything happening across your tenancies, listings and requests.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Active bookings"
          value={data ? String(data.active_bookings.length) : undefined}
          to="/bookings"
        />
        <StatCard
          icon={Wrench}
          label="Open maintenance"
          value={data ? String(data.open_maintenance) : undefined}
          to="/maintenance"
        />
        <StatCard
          icon={MessageSquare}
          label="Unread notifications"
          value={data ? String(data.unread_notifications) : undefined}
          to="/messages"
        />
        <StatCard
          icon={Building2}
          label={user?.role === 'tenant' ? 'Saved properties' : 'Your listings'}
          value={data ? String(data.my_properties.length) : undefined}
          to={user?.role === 'tenant' ? '/properties' : '/landlord'}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Recent bookings</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/bookings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (data?.active_bookings.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {user?.role === 'tenant'
                  ? 'You have no booking requests yet. Browse properties to get started.'
                  : 'No booking requests on your listings right now.'}
              </p>
            ) : (
              <ul className="divide-y">
                {data?.active_bookings.slice(0, 5).map((booking) => (
                  <li key={booking.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{booking.property_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.start_date)} · {formatMoney(booking.monthly_rent, booking.currency)}/month
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">{booking.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">
              {user?.role === 'tenant' ? 'Your home' : 'Your listings'}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={user?.role === 'tenant' ? '/properties' : '/landlord'}>Manage</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(data?.my_properties.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {user?.role === 'tenant'
                  ? 'Once you sign a tenancy it will appear here.'
                  : 'You have not published any listings yet.'}
              </p>
            ) : (
              <ul className="divide-y">
                {data?.my_properties.slice(0, 5).map((property) => (
                  <li key={property.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <Link
                        to={`/properties/${property.slug || property.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {property.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {property.city}, {property.state}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">{property.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {user?.role === 'tenant' && (
            <QuickAction to="/properties" icon={Building2} label="Find a home" />
          )}
          {(user?.role === 'landlord' || user?.role === 'agent') && (
            <QuickAction to="/landlord" icon={Building2} label="Manage listings" />
          )}
          <QuickAction to="/maintenance" icon={Wrench} label="Maintenance" />
          <QuickAction to="/documents" icon={FileText} label="Documents" />
          <QuickAction to="/messages" icon={MessageSquare} label="Messages" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Building2;
  label: string;
  value: string | undefined;
  to: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <Link to={to} className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {value === undefined ? (
              <Skeleton className="mt-1.5 h-8 w-12" />
            ) : (
              <p className="mt-0.5 text-3xl font-bold tabular-nums">{value}</p>
            )}
          </div>
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof Building2; label: string }) {
  return (
    <Button variant="outline" className="justify-start gap-3 py-6" asChild>
      <Link to={to}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
        <ArrowRight className="ml-auto h-4 w-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}
