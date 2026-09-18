import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPin, DollarSign, Home, User, Clock, AlertCircle } from 'lucide-react';
import { Property } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';

const bookingSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  property: Property;
  onSubmit: (data: BookingFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function BookingForm({ property, onSubmit, onCancel, isLoading = false }: BookingFormProps) {
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<any>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalNights, setTotalNights] = useState(0);
  const { toast } = useToast();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      propertyId: property.id,
      startDate: '',
      endDate: '',
      notes: '',
    },
  });

  const { watch, setValue } = form;
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  // Calculate total price when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const price = property.price * nights;
      
      setTotalNights(nights);
      setTotalPrice(price);
    }
  }, [startDate, endDate, property.price]);

  // Check availability when dates change
  useEffect(() => {
    if (startDate && endDate) {
      checkAvailability();
    }
  }, [startDate, endDate, property.id]);

  const checkAvailability = async () => {
    if (!startDate || !endDate) return;

    setIsCheckingAvailability(true);
    try {
      const data = await apiService.checkAvailability(property.id, startDate, endDate);
      setAvailability(data);
    } catch (error) {
      console.error('Error checking availability:', error);
      toast({
        title: "Error",
        description: "Failed to check property availability",
        variant: "destructive",
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSubmit = async (data: BookingFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      toast({
        title: "Booking Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isAvailable = availability?.isAvailable !== false;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Book Property</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Property Summary */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={property.images[0] || '/placeholder-property.jpg'}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">{property.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin className="h-4 w-4" />
                <span>
                  {property.location.address}, {property.location.city}, {property.location.state}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span>{property.type.charAt(0).toUpperCase() + property.type.slice(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>${property.price}/month</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={property.status === 'available' ? 'default' : 'secondary'}>
                  {property.status === 'available' ? 'Available' : 'Not Available'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startDate">Check-in Date *</Label>
              <Input
                id="startDate"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                {...form.register('startDate')}
                className={form.formState.errors.startDate ? 'border-red-500' : ''}
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Check-out Date *</Label>
              <Input
                id="endDate"
                type="date"
                min={startDate || new Date().toISOString().split('T')[0]}
                {...form.register('endDate')}
                className={form.formState.errors.endDate ? 'border-red-500' : ''}
              />
              {form.formState.errors.endDate && (
                <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Availability Check */}
          {isCheckingAvailability && (
            <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-sm text-blue-600">Checking availability...</span>
            </div>
          )}

          {availability && !isCheckingAvailability && (
            <div className={`p-4 rounded-lg ${
              isAvailable ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center gap-2">
                {isAvailable ? (
                  <>
                    <div className="h-4 w-4 rounded-full bg-green-500"></div>
                    <span className="text-sm text-green-700">
                      Property is available for selected dates
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">
                      Property is not available for selected dates
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Price Calculation */}
          {totalPrice > 0 && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Number of nights:</span>
                  <span className="font-semibold">{totalNights}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Price per night:</span>
                  <span className="font-semibold">${property.price}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Price:</span>
                    <span className="text-2xl font-bold text-primary">${totalPrice}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requests or questions for the landlord..."
              rows={4}
              {...form.register('notes')}
              className={form.formState.errors.notes ? 'border-red-500' : ''}
            />
            {form.formState.errors.notes && (
              <p className="text-sm text-red-500">{form.formState.errors.notes.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isAvailable || isCheckingAvailability}
              className="min-w-32"
            >
              {isLoading ? 'Creating Booking...' : 'Book Now'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
