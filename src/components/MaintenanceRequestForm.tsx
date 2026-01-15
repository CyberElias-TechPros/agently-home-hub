import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Camera, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';

// Validation schema for maintenance request
const maintenanceRequestSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'cleaning', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  area_affected: z.string().optional(),
  access_instructions: z.string().optional(),
  tenant_notes: z.string().optional(),
  images: z.array(z.string()).default([]),
  documents: z.array(z.string()).default([])
});

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

interface MaintenanceRequestFormProps {
  propertyId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<MaintenanceRequestFormData>;
}

export default function MaintenanceRequestForm({
  propertyId,
  onSuccess,
  onCancel,
  initialData
}: MaintenanceRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      property_id: propertyId || '',
      title: '',
      description: '',
      category: 'plumbing',
      priority: 'medium',
      area_affected: '',
      access_instructions: '',
      tenant_notes: '',
      images: [],
      documents: [],
      ...initialData
    }
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageUrl = URL.createObjectURL(file);
      imageUrls.push(imageUrl);
    }

    setUploadedImages(prev => [...prev, ...imageUrls]);
    form.setValue('images', [...form.getValues('images'), ...imageUrls]);
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const documentUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const documentUrl = URL.createObjectURL(file);
      documentUrls.push(documentUrl);
    }

    form.setValue('documents', [...form.getValues('documents'), ...documentUrls]);
  };

  const onSubmit = async (data: MaintenanceRequestFormData) => {
    try {
      setIsSubmitting(true);

      const maintenanceRequest = await apiService.createMaintenanceRequest(data);

      toast({
        title: 'Maintenance Request Submitted',
        description: 'Your maintenance request has been submitted successfully.',
        variant: 'default',
      });

      onSuccess?.();

      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit maintenance request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Submit Maintenance Request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="property_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your property" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Property options will be populated here */}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the issue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed description of the maintenance issue"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select issue category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="plumbing">Plumbing</SelectItem>
                          <SelectItem value="electrical">Electrical</SelectItem>
                          <SelectItem value="hvac">HVAC</SelectItem>
                          <SelectItem value="appliance">Appliance</SelectItem>
                          <SelectItem value="structural">Structural</SelectItem>
                          <SelectItem value="pest_control">Pest Control</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="area_affected"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area Affected</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Kitchen, Living Room, Bedroom"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="access_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="How can we access the area? Any special instructions?"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tenant_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional information for the maintenance team"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-6 border-t pt-6">
              <div>
                <FormLabel className="text-base font-medium">Upload Images</FormLabel>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    id="image-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    {uploadedImages.map((url, index) => (
                      <div key={index} className="relative inline-block mr-2 mb-2">
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="h-32 w-32 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setUploadedImages(prev => prev.filter((_, i) => i !== index));
                            form.setValue('images', form.getValues('images').filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => (document.getElementById('image-upload') as HTMLElement)?.click()}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Add Photos
                  </Button>
                </div>
              </div>

              <div>
                <FormLabel className="text-base font-medium">Upload Documents</FormLabel>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    id="document-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    {form.getValues('documents').map((url, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm text-gray-600 truncate">
                            Document {index + 1}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const docs = form.getValues('documents');
                            form.setValue('documents', docs.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => (document.getElementById('document-upload') as HTMLElement)?.click()}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Add Documents
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setUploadedImages([]);
                  }}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
                {onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
