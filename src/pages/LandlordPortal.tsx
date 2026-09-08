import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, PencilLine, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSEO } from '@/lib/seo/useSEO';
import { formatMoney, parseMoney, propertyTypeLabel } from '@/lib/format';
import { propertyKeys } from '@/lib/query-keys';
import { propertiesApi } from '@/lib/api';
import type { Property, PropertyStatus, PropertyType } from '@/lib/api/types';

const TYPES: PropertyType[] = ['apartment', 'house', 'condo', 'townhouse', 'studio', 'room'];
const STATUSES: PropertyStatus[] = ['available', 'occupied', 'maintenance', 'unavailable', 'draft'];

interface Draft {
  id?: string;
  title: string;
  description: string;
  type: PropertyType;
  price: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  bedrooms: string;
  bathrooms: string;
  area_sqft: string;
  status: PropertyStatus;
}

const EMPTY: Draft = {
  title: '',
  description: '',
  type: 'apartment',
  price: '',
  address_line1: '',
  city: '',
  state: '',
  zip_code: '',
  bedrooms: '1',
  bathrooms: '1',
  area_sqft: '',
  status: 'available',
};

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
];

export default function LandlordPortal() {
  useSEO({ title: 'My properties', description: 'Manage your rental listings.', canonicalPath: '/landlord', noindex: true });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);

  const properties = useQuery({
    queryKey: propertyKeys.mine(),
    queryFn: () => propertiesApi.mine().then((r) => r.data),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: propertyKeys.mine() });
    void queryClient.invalidateQueries({ queryKey: propertyKeys.all });
  };

  const save = useMutation({
    mutationFn: (draft: Draft) => {
      const payload = {
        title: draft.title,
        description: draft.description || undefined,
        type: draft.type,
        price: Number(draft.price),
        address_line1: draft.address_line1,
        city: draft.city,
        state: draft.state,
        zip_code: draft.zip_code,
        bedrooms: Number(draft.bedrooms),
        bathrooms: Number(draft.bathrooms),
        area_sqft: draft.area_sqft ? Number(draft.area_sqft) : undefined,
        status: draft.status,
      };
      return draft.id ? propertiesApi.update(draft.id, payload) : propertiesApi.create(payload);
    },
    onSuccess: () => {
      toast({ title: editing?.id ? 'Listing updated' : 'Listing created' });
      setEditing(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: 'Could not save listing', description: error.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => propertiesApi.remove(id),
    onSuccess: () => {
      toast({ title: 'Listing removed' });
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: 'Could not remove listing', description: error.message, variant: 'destructive' }),
  });

  const startEdit = (property?: Property) => {
    setEditing(
      property
        ? {
            id: property.id,
            title: property.title,
            description: property.description ?? '',
            type: property.type,
            price: String(property.price),
            address_line1: property.address_line1,
            city: property.city,
            state: property.state,
            zip_code: property.zip_code,
            bedrooms: String(property.bedrooms),
            bathrooms: String(property.bathrooms),
            area_sqft: property.area_sqft === null ? '' : String(property.area_sqft),
            status: property.status,
          }
        : { ...EMPTY }
    );
  };

  const list = properties.data ?? [];

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My properties</h1>
          <p className="mt-1 text-muted-foreground">
            Publish, update and retire the listings you own.
          </p>
        </div>
        <Button onClick={() => startEdit()}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New listing
        </Button>
      </header>

      {properties.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : properties.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">
          We could not load your listings. Please try again.
        </p>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium">No listings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first property to start receiving enquiries.
          </p>
          <Button className="mt-6" onClick={() => startEdit()}>
            Add a property
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((property) => (
            <li key={property.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    {property.images[0] && (
                      <img src={property.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/properties/${property.slug || property.id}`}
                      className="font-medium hover:underline"
                    >
                      {property.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {property.address_line1}, {property.city}, {property.state}
                    </p>
                    <p className="mt-0.5 text-sm">
                      {formatMoney(property.price, property.currency)}/year ·{' '}
                      {propertyTypeLabel(property.type)}
                    </p>
                  </div>

                  <Badge variant="outline" className="capitalize">{property.status}</Badge>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(property)}>
                      <PencilLine className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(property.id)}
                      aria-label={`Remove ${property.title}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit listing' : 'New listing'}</DialogTitle>
            <DialogDescription>
              Listings are reviewed before they appear in public search results.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="listing-title">Title</Label>
                <Input
                  id="listing-title"
                  className="mt-1.5"
                  value={editing.title}
                  onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                  placeholder="e.g. Bright 2-bed apartment in Lekki"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="listing-description">Description</Label>
                <Textarea
                  id="listing-description"
                  rows={3}
                  className="mt-1.5"
                  value={editing.description}
                  onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="listing-type">Type</Label>
                <Select
                  value={editing.type}
                  onValueChange={(value) => setEditing({ ...editing, type: value as PropertyType })}
                >
                  <SelectTrigger id="listing-type" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="listing-price">Yearly rent (₦)</Label>
                <Input
                  id="listing-price"
                  inputMode="numeric"
                  className="mt-1.5"
                  value={editing.price}
                  onChange={(event) =>
                    setEditing({ ...editing, price: event.target.value.replace(/[^\d]/g, '') })
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="listing-address">Street address</Label>
                <Input
                  id="listing-address"
                  className="mt-1.5"
                  value={editing.address_line1}
                  onChange={(event) => setEditing({ ...editing, address_line1: event.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="listing-city">City</Label>
                <Input
                  id="listing-city"
                  className="mt-1.5"
                  value={editing.city}
                  onChange={(event) => setEditing({ ...editing, city: event.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="listing-state">State</Label>
                <Select
                  value={editing.state}
                  onValueChange={(value) => setEditing({ ...editing, state: value })}
                >
                  <SelectTrigger id="listing-state" className="mt-1.5">
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="listing-bedrooms">Bedrooms</Label>
                <Input
                  id="listing-bedrooms"
                  type="number"
                  min={0}
                  max={20}
                  className="mt-1.5"
                  value={editing.bedrooms}
                  onChange={(event) => setEditing({ ...editing, bedrooms: event.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="listing-bathrooms">Bathrooms</Label>
                <Input
                  id="listing-bathrooms"
                  type="number"
                  min={0}
                  max={20}
                  className="mt-1.5"
                  value={editing.bathrooms}
                  onChange={(event) => setEditing({ ...editing, bathrooms: event.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="listing-area">Floor area (sqft)</Label>
                <Input
                  id="listing-area"
                  type="number"
                  min={0}
                  className="mt-1.5"
                  value={editing.area_sqft}
                  onChange={(event) => setEditing({ ...editing, area_sqft: event.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="listing-status">Status</Label>
                <Select
                  value={editing.status}
                  onValueChange={(value) => setEditing({ ...editing, status: value as PropertyStatus })}
                >
                  <SelectTrigger id="listing-status" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                save.isPending ||
                !editing?.title.trim() ||
                !editing?.price ||
                parseMoney(editing?.price ?? '') === undefined ||
                !editing?.address_line1.trim() ||
                !editing?.city.trim() ||
                !editing?.state
              }
              onClick={() => editing && save.mutate(editing)}
            >
              {save.isPending ? 'Saving…' : editing?.id ? 'Save changes' : 'Create listing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
