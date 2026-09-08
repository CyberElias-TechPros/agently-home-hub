import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useSEO } from '@/lib/seo/useSEO';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { maintenanceKeys, propertyKeys } from '@/lib/query-keys';
import { maintenanceApi, propertiesApi } from '@/lib/api';
import type { MaintenancePriority, MaintenanceRequest, MaintenanceStatus } from '@/lib/api/types';
import { MaintenanceRequestForm, type MaintenanceFormValues } from '@/components/MaintenanceRequestForm';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning/10 text-warning-foreground border-warning/30',
  assigned: 'bg-primary/10 text-primary border-primary/30',
  in_progress: 'bg-violet/10 text-violet border-violet/30',
  completed: 'bg-success/10 text-success-foreground border-success/30',
  cancelled: 'bg-muted text-muted-foreground',
};

/** Transitions the API accepts; completed and cancelled are terminal. */
const NEXT_STATUSES: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  pending: ['assigned', 'rejected', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
};

export default function Maintenance() {
  useSEO({ title: 'Maintenance', description: 'Track repair requests for your property.', canonicalPath: '/maintenance', noindex: true });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<'all' | MaintenanceStatus>('all');
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<MaintenanceRequest | null>(null);
  const [managementForm, setManagementForm] = useState({
    status: '' as MaintenanceStatus | '',
    priority: '' as MaintenancePriority | '',
    landlord_notes: '',
    actual_cost: '',
  });

  const isTenant = user?.role === 'tenant';

  const requests = useQuery({
    queryKey: maintenanceKeys.all,
    queryFn: () => maintenanceApi.list().then((r) => r.data),
  });

  // Tenants raise requests against the property they occupy; owners work from
  // their own portfolio.
  const properties = useQuery({
    queryKey: propertyKeys.mine(),
    queryFn: () => propertiesApi.mine().then((r) => r.data),
    enabled: isTenant,
  });

  const createRequest = useMutation({
    mutationFn: (values: MaintenanceFormValues) => maintenanceApi.create(values),
    onSuccess: () => {
      toast({ title: 'Request submitted', description: 'Your landlord has been notified.' });
      setCreating(false);
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
    onError: (error: Error) =>
      toast({ title: 'Could not submit request', description: error.message, variant: 'destructive' }),
  });

  const updateRequest = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof maintenanceApi.update>[1] }) =>
      maintenanceApi.update(id, patch),
    onSuccess: () => {
      toast({ title: 'Request updated' });
      setManaging(null);
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
    onError: (error: Error) =>
      toast({ title: 'Could not update request', description: error.message, variant: 'destructive' }),
  });

  const visible = (requests.data ?? []).filter(
    (request) => filter === 'all' || request.status === filter
  );

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="mt-1 text-muted-foreground">
            {isTenant ? 'Requests you have raised on your home.' : 'Repairs across your properties, with response targets.'}
          </p>
        </div>
        {isTenant && (
          <Button onClick={() => setCreating(true)} disabled={(properties.data ?? []).length === 0}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New request
          </Button>
        )}
      </header>

      {isTenant && !properties.isLoading && (properties.data ?? []).length === 0 && (
        <p className="mb-6 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
          You will be able to raise a maintenance request once your tenancy is linked to a property.
        </p>
      )}

      <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | MaintenanceStatus)}>
        <TabsList className="mb-6 flex-wrap">
          {['all', 'pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'rejected'].map((status) => (
            <TabsTrigger key={status} value={status} className="capitalize">
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {requests.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : requests.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">
          We could not load maintenance requests. Please try again.
        </p>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Wrench className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium">Nothing here</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isTenant
              ? 'Requests you raise will be tracked here until they are completed.'
              : 'Requests from your tenants will appear here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((request) => {
            const overdue =
              request.status !== 'completed' &&
              request.status !== 'cancelled' &&
              request.status !== 'rejected' &&
              Date.now() - new Date(request.created_at).getTime() >
                request.response_target_hours * 3600_000;

            return (
              <li key={request.id}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {request.property_title ?? 'Property'} · raised {formatDate(request.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`capitalize ${request.priority === 'emergency' ? 'border-destructive/40 bg-destructive/10 text-destructive' : ''}`}
                        >
                          {request.priority}
                        </Badge>
                        <Badge variant="outline" className={`capitalize ${STATUS_STYLES[request.status] ?? ''}`}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{request.description}</p>

                    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">Category:</dt>
                        <dd className="capitalize">{request.category.replace('_', ' ')}</dd>
                      </div>
                      {request.area_affected && (
                        <div className="flex gap-1.5">
                          <dt className="text-muted-foreground">Area:</dt>
                          <dd>{request.area_affected}</dd>
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">Target response:</dt>
                        <dd className={overdue ? 'font-medium text-destructive' : ''}>
                          {request.response_target_hours}h
                          {overdue && ' — overdue'}
                        </dd>
                      </div>
                      {request.actual_cost !== null && (
                        <div className="flex gap-1.5">
                          <dt className="text-muted-foreground">Cost:</dt>
                          <dd>{formatMoney(request.actual_cost, request.currency)}</dd>
                        </div>
                      )}
                    </dl>

                    {request.landlord_notes && (
                      <p className="rounded-md bg-muted/50 p-3 text-sm">
                        <span className="font-medium">Update: </span>
                        {request.landlord_notes}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })}
                        {request.completed_at && ` · Completed ${formatDateTime(request.completed_at)}`}
                      </p>

                      {!isTenant && NEXT_STATUSES[request.status].length > 0 && (
                        <Button size="sm" variant="outline" onClick={() => {
                          setManaging(request);
                          setManagementForm({
                            status: '',
                            priority: '',
                            landlord_notes: request.landlord_notes ?? '',
                            actual_cost: request.actual_cost === null ? '' : String(request.actual_cost),
                          });
                        }}>
                          Update
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* New request */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New maintenance request</DialogTitle>
            <DialogDescription>
              Describe the problem so your landlord can act on it quickly.
            </DialogDescription>
          </DialogHeader>
          <MaintenanceRequestForm
            properties={properties.data ?? []}
            isSubmitting={createRequest.isPending}
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              await createRequest.mutateAsync(values);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Landlord update */}
      <Dialog open={managing !== null} onOpenChange={(open) => !open && setManaging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update request</DialogTitle>
            <DialogDescription>{managing?.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="manage-status">Status</Label>
              <Select
                value={managementForm.status}
                onValueChange={(value) =>
                  setManagementForm((form) => ({ ...form, status: value as MaintenanceStatus }))
                }
              >
                <SelectTrigger id="manage-status" className="mt-1.5">
                  <SelectValue placeholder="Leave unchanged" />
                </SelectTrigger>
                <SelectContent>
                  {(NEXT_STATUSES[managing?.status ?? 'pending'] ?? []).map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="manage-priority">Priority</Label>
              <Select
                value={managementForm.priority}
                onValueChange={(value) =>
                  setManagementForm((form) => ({ ...form, priority: value as MaintenancePriority }))
                }
              >
                <SelectTrigger id="manage-priority" className="mt-1.5">
                  <SelectValue placeholder="Leave unchanged" />
                </SelectTrigger>
                <SelectContent>
                  {['low', 'medium', 'high', 'emergency'].map((priority) => (
                    <SelectItem key={priority} value={priority} className="capitalize">
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="manage-notes">Note for the tenant</Label>
              <Textarea
                id="manage-notes"
                rows={3}
                className="mt-1.5"
                value={managementForm.landlord_notes}
                onChange={(event) =>
                  setManagementForm((form) => ({ ...form, landlord_notes: event.target.value }))
                }
                placeholder="e.g. Plumber booked for Thursday at 10am."
              />
            </div>

            <div>
              <Label htmlFor="manage-cost">Final cost (₦)</Label>
              <Input
                id="manage-cost"
                inputMode="numeric"
                className="mt-1.5"
                value={managementForm.actual_cost}
                onChange={(event) =>
                  setManagementForm((form) => ({
                    ...form,
                    actual_cost: event.target.value.replace(/[^\d]/g, ''),
                  }))
                }
                placeholder="Optional"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setManaging(null)}>
                Cancel
              </Button>
              <Button
                disabled={updateRequest.isPending}
                onClick={() => {
                  if (!managing) return;
                  const cost = managementForm.actual_cost
                    ? Math.round(Number(managementForm.actual_cost))
                    : null;
                  updateRequest.mutate({
                    id: managing.id,
                    patch: {
                      ...(managementForm.status ? { status: managementForm.status } : {}),
                      ...(managementForm.priority ? { priority: managementForm.priority } : {}),
                      ...(managementForm.landlord_notes ? { landlord_notes: managementForm.landlord_notes } : {}),
                      ...(cost === null ? {} : { actual_cost: cost }),
                    },
                  });
                }}
              >
                Save update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
