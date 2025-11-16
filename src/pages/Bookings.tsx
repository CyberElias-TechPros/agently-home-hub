import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, DollarSign } from 'lucide-react';
import { mockBookings, mockProperties } from '@/lib/mockData';
import { Link } from 'react-router-dom';

export default function Bookings() {
  const statusColors = {
    pending: 'bg-warning',
    confirmed: 'bg-success',
    cancelled: 'bg-destructive',
    completed: 'bg-muted'
  };

  const activeBookings = mockBookings.filter(b => 
    b.status === 'pending' || b.status === 'confirmed'
  );
  const pastBookings = mockBookings.filter(b => 
    b.status === 'completed' || b.status === 'cancelled'
  );

  const renderBookingCard = (booking: typeof mockBookings[0]) => {
    const property = mockProperties.find(p => p.id === booking.propertyId);
    if (!property) return null;

    return (
      <Card key={booking.id} className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-24 h-24 object-cover rounded-lg"
              />
              <div>
                <CardTitle className="mb-2">{property.title}</CardTitle>
                <div className="flex items-center text-muted-foreground text-sm mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.location.city}, {property.location.state}
                </div>
                <Badge className={statusColors[booking.status]}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Check-in</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(booking.startDate).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Check-out</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(booking.endDate).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Total</div>
                <div className="text-sm text-primary font-semibold">
                  ${booking.totalPrice.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/properties/${property.id}`} className="flex-1">
              <Button variant="outline" className="w-full">View Property</Button>
            </Link>
            {booking.status === 'confirmed' && (
              <Button variant="outline" className="flex-1">Modify Booking</Button>
            )}
            {booking.status === 'pending' && (
              <Button variant="destructive" className="flex-1">Cancel Request</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen py-8 pb-20 md:pb-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">
            Manage and track all your property bookings
          </p>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">
              Active Bookings ({activeBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Bookings ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeBookings.length > 0 ? (
              activeBookings.map(renderBookingCard)
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Active Bookings</h3>
                  <p className="text-muted-foreground mb-6">
                    You don't have any active bookings at the moment
                  </p>
                  <Link to="/properties">
                    <Button>Browse Properties</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastBookings.length > 0 ? (
              pastBookings.map(renderBookingCard)
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Past Bookings</h3>
                  <p className="text-muted-foreground">
                    Your booking history will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
