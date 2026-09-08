import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CalendarDays,
  Search,
  Users,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useSEO } from '@/lib/seo/useSEO';
import { formatDate } from '@/lib/format';
import { adminApi } from '@/lib/api';
import type { User } from '@/lib/api/types';

const ROLES: User['role'][] = ['tenant', 'landlord', 'agent', 'admin'];

export default function AdminPanel() {
  useSEO({ title: 'Administration', description: 'Platform administration.', canonicalPath: '/admin', noindex: true });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');

  const analytics = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => adminApi.analytics().then((r) => r.data),
  });

  const users = useQuery({
    queryKey: ['admin', 'users', roleFilter, search],
    queryFn: () =>
      adminApi
        .users({
          ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
          ...(search ? { q: search } : {}),
        })
        .then((r) => r),
  });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: User['role'] }) => adminApi.setUserRole(id, role),
    onSuccess: () => {
      toast({ title: 'Role updated' });
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error: Error) =>
      toast({ title: 'Could not update role', description: error.message, variant: 'destructive' }),
  });

  const setDisabled = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) => adminApi.disableUser(id, disabled),
    onSuccess: () => {
      toast({ title: 'Account updated' });
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error: Error) =>
      toast({ title: 'Could not update account', description: error.message, variant: 'destructive' }),
  });

  const userList = users.data?.data ?? [];

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
        <p className="mt-1 text-muted-foreground">
          Platform health, accounts and moderation. Every action here is recorded in the audit log.
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Users} label="Total users" value={analytics.data ? String(analytics.data.total_users) : undefined} />
        <Metric icon={Building2} label="Properties" value={analytics.data ? String(analytics.data.total_properties) : undefined} />
        <Metric icon={CalendarDays} label="Bookings" value={analytics.data ? String(analytics.data.total_bookings) : undefined} />
        <Metric icon={Wrench} label="Open maintenance" value={analytics.data ? String(analytics.data.open_maintenance_requests) : undefined} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {analytics.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : analytics.isError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">
              Could not load platform analytics.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Users by role</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    {Object.entries(analytics.data?.users_by_role ?? {}).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <dt className="capitalize text-muted-foreground">{role}</dt>
                        <dd className="font-semibold tabular-nums">{count}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {analytics.data?.new_users_last_30_days ?? 0} new users in the last 30 days.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bookings by status</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    {Object.entries(analytics.data?.bookings_by_status ?? {}).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <dt className="capitalize text-muted-foreground">{status.replace('_', ' ')}</dt>
                        <dd className="font-semibold tabular-nums">{count}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                aria-label="Search users"
                placeholder="Search by name or email…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44" aria-label="Filter by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {users.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : userList.length === 0 ? (
            <p className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              No users match these filters.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userList.map((account) => {
                    const isSelf = account.id === user?.id;
                    const disabled = account.disabled_at !== null;

                    return (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell className="text-muted-foreground">{account.email}</TableCell>
                        <TableCell>
                          <Select
                            value={account.role}
                            disabled={isSelf}
                            onValueChange={(value) =>
                              setRole.mutate({ id: account.id, role: value as User['role'] })
                            }
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((role) => (
                                <SelectItem key={role} value={role} className="capitalize">
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(account.created_at)}
                        </TableCell>
                        <TableCell>
                          {disabled ? (
                            <Badge variant="outline" className="border-destructive/40 text-destructive">
                              Disabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-success/40 text-success">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isSelf || setDisabled.isPending}
                            onClick={() => setDisabled.mutate({ id: account.id, disabled: !disabled })}
                          >
                            {disabled ? 'Enable' : 'Disable'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | undefined;
}) {
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
