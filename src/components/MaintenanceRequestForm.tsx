import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MaintenanceCategory, MaintenancePriority, PropertySummary } from '@/lib/api/types';

const CATEGORIES: MaintenanceCategory[] = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'structural',
  'pest_control',
  'cleaning',
  'other',
];

const PRIORITIES: Array<{ value: MaintenancePriority; label: string; hint: string }> = [
  { value: 'low', label: 'Low', hint: 'Response within 1 week' },
  { value: 'medium', label: 'Medium', hint: 'Response within 72 hours' },
  { value: 'high', label: 'High', hint: 'Response within 24 hours' },
  { value: 'emergency', label: 'Emergency', hint: 'Response within 4 hours' },
];

const schema = z.object({
  property_id: z.string().min(1, 'Choose which property this is about.'),
  title: z.string().min(5, 'Give the request a short title.').max(160),
  description: z.string().min(15, 'Describe the problem in a little more detail.').max(4000),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'cleaning', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'emergency']),
  area_affected: z.string().max(120).optional(),
  access_instructions: z.string().max(500).optional(),
});

export type MaintenanceFormValues = z.infer<typeof schema>;

interface Props {
  properties: PropertySummary[];
  onSubmit: (values: MaintenanceFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function MaintenanceRequestForm({ properties, onSubmit, onCancel, isSubmitting }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      property_id: properties.length === 1 ? properties[0].id : '',
      title: '',
      description: '',
      category: 'plumbing',
      priority: 'medium',
      area_affected: '',
      access_instructions: '',
    },
  });

  const priority = watch('priority');
  const category = watch('category');

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="maintenance-property">Property</Label>
        <Select
          value={watch('property_id')}
          onValueChange={(value) => setValue('property_id', value, { shouldValidate: true })}
        >
          <SelectTrigger id="maintenance-property" className="mt-1.5">
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.property_id && (
          <p className="mt-1 text-sm text-destructive">{errors.property_id.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="maintenance-title">What is the problem?</Label>
        <Input
          id="maintenance-title"
          className="mt-1.5"
          placeholder="e.g. Kitchen tap leaking"
          {...register('title')}
        />
        {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="maintenance-description">Describe it</Label>
        <Textarea
          id="maintenance-description"
          rows={4}
          className="mt-1.5"
          placeholder="When did it start? Is it getting worse? Anything you have already tried?"
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="maintenance-category">Category</Label>
          <Select
            value={category}
            onValueChange={(value) =>
              setValue('category', value as MaintenanceCategory, { shouldValidate: true })
            }
          >
            <SelectTrigger id="maintenance-category" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="maintenance-priority">Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) =>
              setValue('priority', value as MaintenancePriority, { shouldValidate: true })
            }
          >
            <SelectTrigger id="maintenance-priority" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            {PRIORITIES.find((option) => option.value === priority)?.hint}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="maintenance-area">Area affected (optional)</Label>
          <Input
            id="maintenance-area"
            className="mt-1.5"
            placeholder="e.g. Master bathroom"
            {...register('area_affected')}
          />
        </div>
        <div>
          <Label htmlFor="maintenance-access">Access notes (optional)</Label>
          <Input
            id="maintenance-access"
            className="mt-1.5"
            placeholder="e.g. Key with the neighbour"
            {...register('access_instructions')}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit request'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export default MaintenanceRequestForm;
