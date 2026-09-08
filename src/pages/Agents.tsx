import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSEO } from '@/lib/seo/useSEO';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { leadKeys } from '@/lib/query-keys';
import { leadsApi } from '@/lib/api';
import type { Lead, LeadStatus } from '@/lib/api/types';

const PIPELINE: LeadStatus[] = ['new', 'contacted', 'qualified', 'closed_won', 'closed_lost'];

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-primary/10 text-primary border-primary/30',
  contacted: 'bg-violet/10 text-violet border-violet/30',
  qualified: 'bg-warning/10 text-warning-foreground border-warning/30',
  closed_won: 'bg-success/10 text-success-foreground border-success/30',
  closed_lost: 'bg-muted text-muted-foreground',
};

export default function Agents() {
  useSEO({ title: 'Agent CRM', description: 'Manage leads, showings and commissions.', canonicalPath: '/agents', noindex: true });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'website',
    budget_max: '',
    notes: '',
  });

  const leads = useQuery({ queryKey: leadKeys.all, queryFn: () => leadsApi.list().then((r) => r.data) });
  const stats = useQuery({
    queryKey: ['leads', 'statistics'],
    queryFn: () => leadsApi.statistics().then((r) => r.data),
  });
  const showings = useQuery({
    queryKey: ['leads', 'showings'],
    queryFn: () => leadsApi.showings().then((r) => r.data),
  });
  const commissions = useQuery({
    queryKey: ['leads', 'commissions'],
    queryFn: () => leadsApi.commissions().then((r) => r.data),
  });
  const invalidateAll = () => {
    for (const key of [leadKeys.all, ['leads', 'statistics'], ['leads', 'showings'], ['leads', 'commissions']]) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const createLead = useMutation({
    mutationFn: () =>
      leadsApi.create({
        first_name: newLead.first_name,
        last_name: newLead.last_name,
        ...(newLead.email ? { email: newLead.email } : {}),
        ...(newLead.phone ? { phone: newLead.phone } : {}),
        source: newLead.source,
        ...(newLead.budget_max ? { budget_max: Number(newLead.budget_max) } : {}),
        ...(newLead.notes ? { notes: newLead.notes } : {}),
      }),
    onSuccess: () => {
      toast({ title: 'Lead created' });
      setCreating(false);
      setNewLead({ first_name: '', last_name: '', email: '', phone: '', source: 'website', budget_max: '', notes: '' });
      invalidateAll();
    },
    onError: (error: Error) =>
      toast({ title: 'Could not create lead', description: error.message, variant: 'destructive' }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => leadsApi.updateStatus(id, status),
    onSuccess: invalidateAll,
    onError: (error: Error) =>
      toast({ title: 'Could not update lead', description: error.message, variant: 'destructive' }),
  });

  const updateShowing = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'scheduled' | 'completed' | 'cancelled' }) =>
      leadsApi.updateShowingStatus(id, status),
    onSuccess: invalidateAll,
    onError: (error: Error) =>
      toast({ title: 'Could not update showing', description: error.message, variant: 'destructive' }),
  });

  const byStage = PIPELINE.map((status) => ({
    status,
    leads: (leads.data ?? []).filter((lead) => lead.status === status),
  }));

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent CRM</h1>
          <p className="mt-1 text-muted-foreground">Track enquiries from first contact to closed deal.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Users className="mr-2 h-4 w-4" aria-hidden="true" />
          Add lead
        </Button>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={Users}
          label="Total leads"
          value={stats.data ? String(stats.data.total_leads) : undefined}
        />
        <Metric
          icon={TrendingUp}
          label="Conversion rate"
          value={stats.data ? `${stats.data.conversion_rate.toFixed(1)}%` : undefined}
        />
        <Metric
          icon={BarChart3}
          label="Avg. lead score"
          value={stats.data ? stats.data.avg_lead_score.toFixed(0) : undefined}
        />
        <Metric
          icon={DollarSign}
          label="Commission pending"
          value={
            commissions.data
              ? formatMoney(
                  commissions.data
                    .filter((commission) => commission.status === 'pending')
                    .reduce((total, commission) => total + commission.commission_amount, 0)
                )
              : undefined
          }
        />
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="mb-6">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="leads">All leads</TabsTrigger>
          <TabsTrigger value="showings">Showings</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          {leads.isLoading ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-64 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {byStage.map(({ status, leads: stageLeads }) => (
                <div key={status} className="rounded-lg border bg-muted/30 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold capitalize">{status.replace('_', ' ')}</h2>
                    <Badge variant="secondary">{stageLeads.length}</Badge>
                  </div>
                  <ul className="space-y-2">
                    {stageLeads.length === 0 ? (
                      <li className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                        None
                      </li>
                    ) : (
                      stageLeads.map((lead) => (
                        <li key={lead.id}>
                          <LeadCard
                            lead={lead}
                            onStatusChange={(next) => setStatus.mutate({ id: lead.id, status: next })}
                          />
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads">
          {leads.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (leads.data ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="font-medium">No leads yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first lead to start tracking enquiries.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Contact</th>
                    <th className="p-3 font-medium">Budget</th>
                    <th className="p-3 font-medium">Score</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(leads.data ?? []).map((lead) => (
                    <tr key={lead.id}>
                      <td className="p-3 font-medium">
                        {lead.first_name} {lead.last_name}
                      </td>
                      <td className="p-3 text-muted-foreground">{lead.email ?? lead.phone ?? '—'}</td>
                      <td className="p-3">
                        {lead.budget_max !== null ? formatMoney(lead.budget_max) : '—'}
                      </td>
                      <td className="p-3">{lead.lead_score}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={`capitalize ${STATUS_STYLES[lead.status] ?? ''}`}>
                          {lead.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDate(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="showings">
          {showings.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (showings.data ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="font-medium">No showings scheduled</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {(showings.data ?? []).map((showing) => (
                <li key={showing.id}>
                  <Card>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-medium">{showing.client_name}</p>
                        <p className="text-sm text-muted-foreground">{showing.property_address}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(showing.scheduled_date)} at {showing.scheduled_time} ·{' '}
                          {showing.duration_minutes} min
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{showing.status}</Badge>
                        {showing.status === 'scheduled' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updateShowing.isPending}
                              onClick={() => updateShowing.mutate({ id: showing.id, status: 'completed' })}
                            >
                              Completed
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updateShowing.isPending}
                              onClick={() => updateShowing.mutate({ id: showing.id, status: 'cancelled' })}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="commissions">
          {commissions.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (commissions.data ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <DollarSign className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="font-medium">No commissions recorded</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Deal value</th>
                    <th className="p-3 font-medium">Rate</th>
                    <th className="p-3 font-medium">Commission</th>
                    <th className="p-3 font-medium">Closing</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(commissions.data ?? []).map((commission) => (
                    <tr key={commission.id}>
                      <td className="p-3">{formatMoney(commission.deal_value)}</td>
                      <td className="p-3">{commission.commission_rate}%</td>
                      <td className="p-3 font-medium">{formatMoney(commission.commission_amount)}</td>
                      <td className="p-3 text-muted-foreground">
                        {commission.closing_date ? formatDate(commission.closing_date) : '—'}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="capitalize">{commission.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New lead */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a lead</DialogTitle>
            <DialogDescription>Record a new enquiry and start tracking it.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="lead-first">First name</Label>
              <Input
                id="lead-first"
                className="mt-1.5"
                value={newLead.first_name}
                onChange={(event) => setNewLead((lead) => ({ ...lead, first_name: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="lead-last">Last name</Label>
              <Input
                id="lead-last"
                className="mt-1.5"
                value={newLead.last_name}
                onChange={(event) => setNewLead((lead) => ({ ...lead, last_name: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                className="mt-1.5"
                value={newLead.email}
                onChange={(event) => setNewLead((lead) => ({ ...lead, email: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                className="mt-1.5"
                value={newLead.phone}
                onChange={(event) => setNewLead((lead) => ({ ...lead, phone: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="lead-budget">Budget (₦)</Label>
              <Input
                id="lead-budget"
                inputMode="numeric"
                className="mt-1.5"
                value={newLead.budget_max}
                onChange={(event) =>
                  setNewLead((lead) => ({ ...lead, budget_max: event.target.value.replace(/[^\d]/g, '') }))
                }
              />
            </div>
            <div>
              <Label htmlFor="lead-source">Source</Label>
              <Select
                value={newLead.source}
                onValueChange={(value) => setNewLead((lead) => ({ ...lead, source: value }))}
              >
                <SelectTrigger id="lead-source" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['website', 'referral', 'walk_in', 'social_media', 'advert', 'other'].map((source) => (
                    <SelectItem key={source} value={source} className="capitalize">
                      {source.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              rows={3}
              className="mt-1.5"
              value={newLead.notes}
              onChange={(event) => setNewLead((lead) => ({ ...lead, notes: event.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              disabled={createLead.isPending || !newLead.first_name.trim() || !newLead.last_name.trim()}
              onClick={() => createLead.mutate()}
            >
              Create lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | undefined }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {value === undefined ? (
            <Skeleton className="mt-1.5 h-7 w-16" />
          ) : (
            <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
          )}
        </div>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}

function LeadCard({ lead, onStatusChange }: { lead: Lead; onStatusChange: (status: LeadStatus) => void }) {
  const next = PIPELINE[PIPELINE.indexOf(lead.status) + 1];

  return (
    <Card>
      <CardContent className="p-3">
        <p className="truncate text-sm font-medium">
          {lead.first_name} {lead.last_name}
        </p>
        {lead.budget_max !== null && (
          <p className="text-xs text-muted-foreground">{formatMoney(lead.budget_max)}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Score {lead.lead_score}</p>
        {next && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full text-xs"
            onClick={() => onStatusChange(next)}
          >
            Move to {next.replace('_', ' ')}
          </Button>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">{formatDateTime(lead.created_at)}</p>
      </CardContent>
    </Card>
  );
}
