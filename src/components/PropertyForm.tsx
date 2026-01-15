import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Plus, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Property } from '@/types';

const propertySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  type: z.enum(['apartment', 'house', 'condo', 'townhouse', 'studio', 'room']),
  price: z.number().min(1, 'Price must be greater than 0'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().default('USA'),
  bedrooms: z.number().min(0).default(0),
  bathrooms: z.number().min(0).default(0),
  area: z.number().min(1, 'Area is required'),
  yearBuilt: z.number().optional(),
  amenities: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  availableFrom: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  property?: Property;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const propertyTypes = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'studio', label: 'Studio' },
  { value: 'room', label: 'Room' },
];

const commonAmenities = [
  'Parking', 'Gym', 'Pool', 'Pet-friendly', 'Laundry',
  'Air Conditioning', 'Heating', 'Dishwasher', 'Refrigerator',
  'Microwave', 'Oven', 'Balcony', 'Storage', 'Doorman',
  'Elevator', 'Wheelchair Accessible', 'Garden', 'Fireplace',
  'Hardwood Floors', 'Carpet', 'Natural Light', 'View',
  'In-unit Laundry', 'Central Air', 'Walk-in Closet',
  'High Ceilings', 'Updated Kitchen', 'Stainless Steel Appliances'
];

export default function PropertyForm({ property, onSubmit, onCancel, isLoading = false }: PropertyFormProps) {
  const [images, setImages] = useState<string[]>(property?.images || []);
  const [amenities, setAmenities] = useState<string[]>(property?.amenities || []);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: property?.title || '',
      description: property?.description || '',
      type: property?.type || 'apartment',
      price: property?.price || 0,
      address: property?.location?.address || '',
      city: property?.location?.city || '',
      state: property?.location?.state || '',
      zipCode: property?.location?.zipCode || '',
      country: 'USA',
      bedrooms: property?.bedrooms || 0,
      bathrooms: property?.bathrooms || 0,
      area: property?.area || 0,
      yearBuilt: property?.yearBuilt,
      amenities: property?.amenities || [],
      featured: property?.featured || false,
      availableFrom: property?.availableFrom || '',
    },
  });

  useEffect(() => {
    form.setValue('amenities', amenities);
  }, [amenities, form]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);
    const newImages: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          newImages.push(result);
          
          if (newImages.length === files.length) {
            setImages(prev => [...prev, ...newImages]);
            setIsUploading(false);
            toast({
              title: "Images uploaded",
              description: `${files.length} image(s) added successfully`,
            });
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Image removed",
      description: "Image has been removed from the property",
    });
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev => {
      if (prev.includes(amenity)) {
        return prev.filter(a => a !== amenity);
      } else {
        return [...prev, amenity];
      }
    });
  };

  const handleSubmit = async (data: PropertyFormData) => {
    try {
      const submitData = {
        ...data,
        images,
        amenities,
      };
      await onSubmit(submitData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save property. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {property ? 'Edit Property' : 'Add New Property'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Property Title *</Label>
              <Input
                id="title"
                placeholder="Modern Downtown Apartment"
                {...form.register('title')}
                className={form.formState.errors.title ? 'border-red-500' : ''}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Property Type *</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value) => form.setValue('type', value as any)}
              >
                <SelectTrigger className={form.formState.errors.type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-sm text-red-500">{form.formState.errors.type.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your property..."
              rows={4}
              {...form.register('description')}
              className={form.formState.errors.description ? 'border-red-500' : ''}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Pricing and Availability */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="price">Monthly Price ($) *</Label>
              <Input
                id="price"
                type="number"
                placeholder="2500"
                {...form.register('price', { valueAsNumber: true })}
                className={form.formState.errors.price ? 'border-red-500' : ''}
              />
              {form.formState.errors.price && (
                <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="available_from">Available From</Label>
              <Input
                id="availableFrom"
                type="date"
                {...form.register('availableFrom')}
                className={form.formState.errors.availableFrom ? 'border-red-500' : ''}
              />
              {form.formState.errors.availableFrom && (
                <p className="text-sm text-red-500">{form.formState.errors.availableFrom.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured">Featured Property</Label>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  id="featured"
                  {...form.register('featured')}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="featured" className="text-sm">
                  Display on homepage and search results
                </Label>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street"
                  {...form.register('address')}
                  className={form.formState.errors.address ? 'border-red-500' : ''}
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-red-500">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="San Francisco"
                  {...form.register('city')}
                  className={form.formState.errors.city ? 'border-red-500' : ''}
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-red-500">{form.formState.errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="CA"
                  {...form.register('state')}
                  className={form.formState.errors.state ? 'border-red-500' : ''}
                />
                {form.formState.errors.state && (
                  <p className="text-sm text-red-500">{form.formState.errors.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input
                  id="zipCode"
                  placeholder="94102"
                  {...form.register('zipCode')}
                  className={form.formState.errors.zipCode ? 'border-red-500' : ''}
                />
                {form.formState.errors.zipCode && (
                  <p className="text-sm text-red-500">{form.formState.errors.zipCode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="USA"
                  {...form.register('country')}
                />
              </div>
            </div>
          </div>

          {/* Property Specifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Property Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  placeholder="2"
                  {...form.register('bedrooms', { valueAsNumber: true })}
                  className={form.formState.errors.bedrooms ? 'border-red-500' : ''}
                />
                {form.formState.errors.bedrooms && (
                  <p className="text-sm text-red-500">{form.formState.errors.bedrooms.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  step="0.5"
                  placeholder="2"
                  {...form.register('bathrooms', { valueAsNumber: true })}
                  className={form.formState.errors.bathrooms ? 'border-red-500' : ''}
                />
                {form.formState.errors.bathrooms && (
                  <p className="text-sm text-red-500">{form.formState.errors.bathrooms.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area (sqft) *</Label>
                <Input
                  id="area"
                  type="number"
                  placeholder="1200"
                  {...form.register('area', { valueAsNumber: true })}
                  className={form.formState.errors.area ? 'border-red-500' : ''}
                />
                {form.formState.errors.area && (
                  <p className="text-sm text-red-500">{form.formState.errors.area.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearBuilt">Year Built</Label>
                <Input
                  id="yearBuilt"
                  type="number"
                  placeholder="2010"
                  {...form.register('yearBuilt', { valueAsNumber: true })}
                  className={form.formState.errors.yearBuilt ? 'border-red-500' : ''}
                />
                {form.formState.errors.yearBuilt && (
                  <p className="text-sm text-red-500">{form.formState.errors.yearBuilt.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Images Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Property Images</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="image-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload images</span>
                    <input
                      id="image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Property image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {commonAmenities.map((amenity) => (
                <Badge
                  key={amenity}
                  variant={amenities.includes(amenity) ? "default" : "outline"}
                  className="cursor-pointer justify-center py-2 px-3"
                  onClick={() => toggleAmenity(amenity)}
                >
                  {amenity}
                </Badge>
              ))}
            </div>
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
              disabled={isLoading || isUploading}
              className="min-w-32"
            >
              {isLoading ? 'Saving...' : (property ? 'Update Property' : 'Add Property')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
