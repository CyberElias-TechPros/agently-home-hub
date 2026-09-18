import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiService, Lead, LeadStats } from '@/lib/api';
import { Users, Target, TrendingUp, Phone, Mail, MapPin, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-600',
  contacted: 'bg-amber-500/15 text-amber-600',
  qualified: 'bg-emerald-500/15 text-emerald-600',
  touring: 'bg-violet-500/15 text-violet-600',
  negotiating: 'bg-fuchsia-500/15 text-fuchsia-600',
  closed_won: 'bg-green-600/15 text-green-700',
  closed_lost: 'bg-red-500/15 text-red-600',
};

export default function AgentCRMDashboard() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [leadsData, statsData] = await Promise.all([
        apiService.getLeads(),
        apiService.getLeadStatistics(),
      ]);
      setLeads(leadsData);
      setStats(statsData);
    } catch (err) {
      toast({
        title: 'Could not load leads',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      leads.filter((lead) => {
        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          lead.fullName.toLowerCase().includes(q) ||
          (lead.email ?? '').toLowerCase().includes(q) ||
          (lead.source ?? '').toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      }),
    [leads, search, statusFilter],
  );

  const advance = async (lead: Lead) => {
    const order = ['new', 'contacted', 'qualified', 'touring', 'negotiating', 'closed_won'];
    const idx = order.indexOf(lead.status);
    const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : lead.status;
    if (next === lead.status) return;
    try {
      const updated = await apiService.updateLead(lead.id, { status: next });
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      toast({ title: 'Lead updated', description: `${lead.fullName} → ${next.replace('_', ' ')}` });
    } catch (err) {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const statCards = [
    { label: 'Total leads', value: stats?.total ?? 0, icon: Users, tone: 'text-blue-600 bg-blue-100' },
    { label: 'New', value: stats?.new ?? 0, icon: TrendingUp, tone: 'text-emerald-600 bg-emerald-100' },
    { label: 'Qualified', value: stats?.qualified ?? 0, icon: Target, tone: 'text-amber-600 bg-amber-100' },
    { label: 'Conversion', value: `${stats?.conversion_rate ?? 0}%`, icon: RefreshCw, tone: 'text-violet-600 bg-violet-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? <Skeleton className="h-7 w-16" /> : s.value}
                </p>
              </div>
              <div className={cn('p-3 rounded-full', s.tone)}>
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Leads ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.keys(STATUS_STYLES).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No leads match your filters yet.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((lead) => (
                <li key={lead.id} className="py-3 flex flex-col md:flex-row md:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{lead.fullName}</span>
                      <Badge className={STATUS_STYLES[lead.status] ?? 'bg-muted'}>
                        {lead.status.replace('_', ' ')}
                      </Badge>
                      {lead.priority === 'high' && <Badge variant="destructive">priority</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lead.email}</span>
                      {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{lead.phone}</span>}
                      <span className="inline-flex items-center gap-1 capitalize"><Target className="h-3.5 w-3.5" />{lead.source}</span>
                      {lead.budgetMax ? (
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />up to ${lead.budgetMax}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">score {Math.round(lead.leadScore ?? 0)}</span>
                    <Button size="sm" variant="outline" onClick={() => advance(lead)}>
                      Next stage
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
