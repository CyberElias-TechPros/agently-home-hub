import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CalendarIcon, MapPin, DollarSign, Clock, User, Home, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiService } from '@/lib/api';
import { Booking, Property } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface BookingWithProperty extends Booking {
  property_title?: string;
  property?: Property;
  landlord_name?: string;
  landlord_email?: string;
  tenant_name?: string;
  tenant_email?: string;
  notes?: string;
}

export default function Bookings() {
  const [bookings, setBookings] = useState<BookingWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');
  const { user } = useAuth();
  const { toast } = useToast();

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getBookings();
      setBookings(data);
    } catch (error) {
      toast({
        title: "Error loading bookings",
        description: "Failed to load your bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateNights = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await apiService.cancelBooking(bookingId);
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully.",
      });
      loadBookings(); // Reload bookings
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await apiService.updateBookingStatus(bookingId, newStatus);
      toast({
        title: "Status Updated",
        description: `Booking status has been updated to ${newStatus}.`,
      });
      loadBookings(); // Reload bookings
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const currentBookings = bookings.filter(b => 
    ['pending', 'confirmed'].includes(b.status)
  );

  const pastBookings = bookings.filter(b => 
    ['completed', 'cancelled'].includes(b.status)
  );

  const BookingCard = ({ booking }: { booking: BookingWithProperty }) => (
    <Card className="mb-4">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Property Info */}
          <div className="lg:w-1/3">
            {booking.property?.images && (
              <div className="w-full h-48 rounded-lg overflow-hidden mb-4">
                <img
                  src={booking.property.images[0]}
                  alt={booking.property_title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h3 className="font-semibold text-lg mb-2">{booking.property_title}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>
                  {booking.property?.location?.address}, {booking.property?.location?.city}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span>{booking.property?.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>${booking.property?.price}/month</span>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="lg:w-2/3 space-y-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Badge className={getStatusColor(booking.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(booking.status)}
                    <span className="capitalize">{booking.status}</span>
                  </div>
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Booking ID</div>
                <div className="font-mono text-xs">{booking.id}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Check-in</div>
                <div className="font-semibold">{formatDate(booking.startDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Check-out</div>
                <div className="font-semibold">{formatDate(booking.endDate)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Nights</div>
                <div className="font-semibold">
                  {calculateNights(booking.startDate, booking.endDate)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Price</div>
                <div className="font-semibold text-lg text-primary">
                  ${booking.totalPrice}
                </div>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-4 p-3 bg-muted/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Notes</div>
                <div className="text-sm">{booking.notes}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              {user?.role === 'tenant' && booking.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelBooking(booking.id)}
                >
                  Cancel Booking
                </Button>
              )}
              
              {user?.role === 'landlord' && ['pending', 'confirmed'].includes(booking.status) && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                    disabled={booking.status === 'confirmed'}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                  >
                    Cancel
                  </Button>
                </>
              )}
              
              {user?.role === 'landlord' && booking.status === 'confirmed' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleUpdateStatus(booking.id, 'completed')}
                >
                  Mark Completed
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 pb-20 md:pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">
            {user?.role === 'tenant' ? 'Manage your property bookings' : 'Manage bookings for your properties'}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Current Bookings ({currentBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Past Bookings ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-6">
            {currentBookings.length > 0 ? (
              <div className="space-y-4">
                {currentBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Current Bookings</h3>
                  <p className="text-muted-foreground">
                    {user?.role === 'tenant' 
                      ? "You don't have any upcoming bookings. Start browsing properties to book your next home!"
                      : "You don't have any current bookings for your properties."
                    }
                  </p>
                  {user?.role === 'tenant' && (
                    <Button className="mt-4" onClick={() => window.location.href = '/properties'}>
                      Browse Properties
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastBookings.length > 0 ? (
              <div className="space-y-4">
                {pastBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Past Bookings</h3>
                  <p className="text-muted-foreground">
                    {user?.role === 'tenant' 
                      ? "You haven't completed any bookings yet."
                      : "You don't have any past bookings for your properties."
                    }
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
