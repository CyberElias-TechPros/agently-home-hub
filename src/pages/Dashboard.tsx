import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Home, FileText, Wrench, MessageSquare, Heart, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AdContainer from '@/components/AdContainer';
import { apiService } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { authService } from '@/lib/auth';
import type { Booking } from '@/types';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const me = await authService.getCurrentUser();
      return me ?? user;
    },
    staleTime: 60_000,
  });

  const { data: bookingsData, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => apiService.getBookings(),
    staleTime: 30_000,
  });

  const { data: maintenanceData, isLoading: isMaintenanceLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => apiService.getMaintenanceRequests(),
    staleTime: 30_000,
  });

  const { data: propertiesData, isLoading: isPropertiesLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiService.getProperties(),
    staleTime: 60_000,
  });

  if (isUserLoading || isBookingsLoading || isMaintenanceLoading || isPropertiesLoading) {
    return <div className="flex justify-center py-32 text-muted-foreground">Loading…</div>;
  }

  const currentId = userData?.id ?? user?.id;
  const userBookings = (bookingsData ?? []).filter((b: Booking) => (b as any).tenantId === currentId) ?? [];
  const userMaintenance = (maintenanceData ?? []).filter((m: any) => (m as any).tenantId === currentId) ?? [];

  const statusColors = {
    pending: 'bg-warning',
    confirmed: 'bg-success',
    cancelled: 'bg-destructive',
    completed: 'bg-muted',
    in_progress: 'bg-primary'
  };

  return (
    <div className="min-h-screen py-8 pb-20 md:pb-8">
      <div className="container mx-auto px-4">
        <AdContainer pageType="dashboard" position="top" className="mb-8" />
        
        {/* User Profile Header */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-gradient-hero text-primary-foreground">
                {userData?.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-1">{userData?.name}</h1>
                  <p className="text-muted-foreground mb-2">{userData?.email}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {userData?.role.charAt(0).toUpperCase() + userData?.role.slice(1)}
                    </Badge>
                    {userData?.verified && (
                      <Badge className="bg-success">Verified</Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline">Edit Profile</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userBookings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userMaintenance.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Favorites</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            {userBookings.map((booking) => {
              const property = propertiesData?.find(p => p.id === booking.propertyId);
              if (!property) return null;

              return (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-32 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{property.title}</h3>
                            <p className="text-sm text-muted-foreground">{property.location.city}, {property.location.state}</p>
                          </div>
                          <Badge className={statusColors[booking.status]}>
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}</span>
                          </div>
                          <span className="font-semibold text-foreground">${booking.totalPrice}</span>
                        </div>
                      </div>
                      <Link to={`/properties/${property.id}`}>
                        <Button variant="outline">View Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            {userMaintenance.map((request) => {
              const property = propertiesData?.find(p => p.id === request.propertyId);
              if (!property) return null;

              return (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{request.title}</h3>
                        <p className="text-sm text-muted-foreground">{property.title}</p>
                      </div>
                      <Badge className={statusColors[request.status]}>
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm mb-4">{request.description}</p>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{request.category}</Badge>
                      <Badge variant="outline">{request.priority} priority</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="favorites">
            <Card>
              <CardContent className="p-12 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Favorites Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start adding properties to your favorites to see them here
                </p>
                <Link to="/properties">
                  <Button>Browse Properties</Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Activity History</h3>
                <p className="text-muted-foreground">
                  Your recent activity will appear here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <AdContainer pageType="dashboard" position="bottom" />
    </div>
  );
}
