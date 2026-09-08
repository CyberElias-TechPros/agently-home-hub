import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PropertySummary } from '@/lib/api/types';

export const bookingSchema = z
  .object({
    start_date: z.string().min(1, 'Choose the date you would like to move in.'),
    end_date: z.string().optional(),
    message: z.string().max(1000, 'Please keep your message under 1000 characters.').optional(),
  })
  .refine((value) => !value.end_date || value.end_date > value.start_date, {
    message: 'The end date must be after the start date.',
    path: ['end_date'],
  });

export type BookingFormValues = z.infer<typeof bookingSchema>;

interface Props {
  property: PropertySummary;
  onSubmit: (values: BookingFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

/**
 * Requests a viewing / tenancy start for a listing.
 *
 * The dates describe when the tenant wants to take possession, not a
 * nightly-stay range, so the field labels say exactly that.
 */
export function BookingForm({ property, onSubmit, onCancel, isSubmitting }: Props) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { start_date: '', end_date: '', message: '' },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const startDate = watch('start_date');

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="space-y-4"
      noValidate
    >
      <div>
        <Label>Preferred move-in date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn('mt-1.5 w-full justify-start font-normal', !startDate && 'text-muted-foreground')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {startDate ? format(new Date(startDate), 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate ? new Date(startDate) : undefined}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const earliest = property.available_from ? new Date(property.available_from) : today;
                return date < (earliest > today ? earliest : today);
              }}
              onSelect={(date) =>
                setValue('start_date', date ? format(date, 'yyyy-MM-dd') : '', { shouldValidate: true })
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.start_date && (
          <p className="mt-1 text-sm text-destructive">{errors.start_date.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="booking-end">Lease end date (optional)</Label>
        <Input
          id="booking-end"
          type="date"
          className="mt-1.5"
          min={startDate || undefined}
          {...register('end_date')}
        />
        {errors.end_date && <p className="mt-1 text-sm text-destructive">{errors.end_date.message}</p>}
      </div>

      <div>
        <Label htmlFor="booking-message">Message to the landlord (optional)</Label>
        <Textarea
          id="booking-message"
          rows={3}
          className="mt-1.5"
          placeholder="Tell them a little about yourself and when you are free to view the property."
          {...register('message')}
        />
        {errors.message && <p className="mt-1 text-sm text-destructive">{errors.message.message}</p>}
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Sending request…' : 'Request this property'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        The landlord or agent will confirm or decline. Nothing is paid through Agently at this stage.
      </p>
    </form>
  );
}

export default BookingForm;
