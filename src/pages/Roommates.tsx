import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useSEO } from '@/lib/seo/useSEO';
import { formatMoney } from '@/lib/format';
import { roommatesApi } from '@/lib/api';
import type { RoommateProfileInput } from '@/lib/api/types';

interface ProfileDraft {
  headline: string;
  bio: string;
  age: string;
  occupation: string;
  budget_min: string;
  budget_max: string;
  preferred_city: string;
  smoking: boolean;
  pets: boolean;
  night_owl: boolean;
  cleanliness: number;
  social_level: number;
}

const EMPTY_DRAFT: ProfileDraft = {
  headline: '',
  bio: '',
  age: '',
  occupation: '',
  budget_min: '',
  budget_max: '',
  preferred_city: '',
  smoking: false,
  pets: false,
  night_owl: false,
  cleanliness: 3,
  social_level: 3,
};

function toDraft(profile: {
  headline: string | null;
  bio: string | null;
  age: number | null;
  occupation: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_city: string | null;
  smoking: boolean;
  pets: boolean;
  night_owl: boolean;
  cleanliness: number;
  social_level: number;
}): ProfileDraft {
  return {
    headline: profile.headline ?? '',
    bio: profile.bio ?? '',
    age: profile.age === null ? '' : String(profile.age),
    occupation: profile.occupation ?? '',
    budget_min: profile.budget_min === null ? '' : String(profile.budget_min),
    budget_max: profile.budget_max === null ? '' : String(profile.budget_max),
    preferred_city: profile.preferred_city ?? '',
    smoking: profile.smoking,
    pets: profile.pets,
    night_owl: profile.night_owl,
    cleanliness: profile.cleanliness,
    social_level: profile.social_level,
  };
}

export default function Roommates() {
  useSEO({ title: 'Roommate matching', description: 'Find a compatible roommate in your city.', canonicalPath: '/roommates', noindex: true });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  const profile = useQuery({
    queryKey: ['roommates', 'profile'],
    queryFn: () => roommatesApi.profile().then((r) => r.data),
  });

  const matches = useQuery({
    queryKey: ['roommates', 'matches'],
    queryFn: () => roommatesApi.matches().then((r) => r.data),
    enabled: profile.data !== null,
  });

  const applications = useQuery({
    queryKey: ['roommates', 'applications'],
    queryFn: () => roommatesApi.applications().then((r) => r.data),
  });

  const saveProfile = useMutation({
    mutationFn: (values: RoommateProfileInput) => roommatesApi.saveProfile(values),
    onSuccess: () => {
      toast({ title: 'Profile saved' });
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['roommates'] });
    },
    onError: (error: Error) =>
      toast({ title: 'Could not save profile', description: error.message, variant: 'destructive' }),
  });

  const apply = useMutation({
    mutationFn: (recipientId: string) => roommatesApi.apply({ recipient_id: recipientId }),
    onSuccess: () => {
      toast({ title: 'Request sent', description: 'They will see your profile and can reply.' });
      void queryClient.invalidateQueries({ queryKey: ['roommates'] });
    },
    onError: (error: Error) =>
      toast({ title: 'Could not send request', description: error.message, variant: 'destructive' }),
  });

  const current: ProfileDraft = draft ?? (profile.data ? toDraft(profile.data) : EMPTY_DRAFT);
  const patch = (changes: Partial<ProfileDraft>) =>
    setDraft({ ...(draft ?? (profile.data ? toDraft(profile.data) : EMPTY_DRAFT)), ...changes });

  const submittedIds = new Set((applications.data ?? []).map((application) => application.recipient_id));

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Roommate matching</h1>
        <p className="mt-1 text-muted-foreground">
          Complete your profile to see people whose budget and habits fit yours.
        </p>
      </header>

      <Tabs defaultValue={profile.data ? 'matches' : 'profile'}>
        <TabsList className="mb-6">
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="profile">My profile</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          {profile.data === null ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="font-medium">Save your profile to see matches</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Matching needs to know your budget and preferences first.
              </p>
            </div>
          ) : matches.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : (matches.data ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="font-medium">No matches yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nobody else in your preferred city has a profile yet. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(matches.data ?? []).map((match) => (
                <Card key={match.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-lg">{match.name ?? 'Roommate'}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {match.age ? `${match.age} · ` : ''}
                          {match.occupation ?? 'Not specified'}
                        </p>
                      </div>
                      {match.match_score !== null && (
                        <Badge className="shrink-0 bg-accent text-accent-foreground">
                          {match.match_score}%
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    {match.headline && (
                      <p className="mb-3 text-sm font-medium">{match.headline}</p>
                    )}
                    {match.bio && (
                      <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">{match.bio}</p>
                    )}

                    {match.match_score !== null && (
                      <Progress value={match.match_score} className="mb-3 h-1.5" />
                    )}

                    <dl className="mb-4 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Budget</dt>
                        <dd>
                          {match.budget_min !== null && match.budget_max !== null
                            ? `${formatMoney(match.budget_min)} – ${formatMoney(match.budget_max)}`
                            : 'Not specified'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">City</dt>
                        <dd>{match.preferred_city ?? '—'}</dd>
                      </div>
                    </dl>

                    {match.match_reasons.length > 0 && (
                      <ul className="mb-4 space-y-1">
                        {match.match_reasons.slice(0, 3).map((reason) => (
                          <li key={reason} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" aria-hidden="true" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      className="mt-auto"
                      size="sm"
                      disabled={submittedIds.has(match.user_id) || apply.isPending}
                      onClick={() => apply.mutate(match.user_id)}
                    >
                      {submittedIds.has(match.user_id) ? 'Request sent' : 'Send request'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Your roommate profile</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.isLoading && !profile.data ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <form
                  className="space-y-5"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    const budgetMin = current.budget_min ? Number(current.budget_min) : undefined;
                    const budgetMax = current.budget_max ? Number(current.budget_max) : undefined;
                    if (budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax) {
                      toast({
                        title: 'Check your budget',
                        description: 'The minimum budget cannot be more than the maximum.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    saveProfile.mutate({
                      headline: current.headline || undefined,
                      bio: current.bio || undefined,
                      age: current.age ? Number(current.age) : undefined,
                      occupation: current.occupation || undefined,
                      budget_min: budgetMin,
                      budget_max: budgetMax,
                      preferred_city: current.preferred_city || undefined,
                      smoking: current.smoking,
                      pets: current.pets,
                      night_owl: current.night_owl,
                      cleanliness: current.cleanliness,
                      social_level: current.social_level,
                    });
                  }}
                >
                  <div>
                    <Label htmlFor="roommate-headline">Headline</Label>
                    <Input
                      id="roommate-headline"
                      className="mt-1.5"
                      placeholder="e.g. Quiet professional looking for a 2-bed in Yaba"
                      value={current.headline}
                      onChange={(event) => patch({ headline: event.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="roommate-bio">About you</Label>
                    <Textarea
                      id="roommate-bio"
                      rows={3}
                      className="mt-1.5"
                      value={current.bio}
                      onChange={(event) => patch({ bio: event.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="roommate-age">Age</Label>
                      <Input
                        id="roommate-age"
                        type="number"
                        min={18}
                        max={99}
                        className="mt-1.5"
                        value={current.age}
                        onChange={(event) => patch({ age: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="roommate-occupation">Occupation</Label>
                      <Input
                        id="roommate-occupation"
                        className="mt-1.5"
                        value={current.occupation}
                        onChange={(event) => patch({ occupation: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="roommate-budget-min">Min budget (₦)</Label>
                      <Input
                        id="roommate-budget-min"
                        inputMode="numeric"
                        className="mt-1.5"
                        value={current.budget_min}
                        onChange={(event) =>
                          patch({ budget_min: event.target.value.replace(/[^\d]/g, '') })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="roommate-budget-max">Max budget (₦)</Label>
                      <Input
                        id="roommate-budget-max"
                        inputMode="numeric"
                        className="mt-1.5"
                        value={current.budget_max}
                        onChange={(event) =>
                          patch({ budget_max: event.target.value.replace(/[^\d]/g, '') })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="roommate-city">Preferred city</Label>
                      <Input
                        id="roommate-city"
                        className="mt-1.5"
                        value={current.preferred_city}
                        onChange={(event) => patch({ preferred_city: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    {(
                      [
                        { key: 'smoking', label: 'I smoke' },
                        { key: 'pets', label: 'I have pets' },
                        { key: 'night_owl', label: 'I keep late hours' },
                      ] as const
                    ).map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={`roommate-${key}`}>{label}</Label>
                        <Switch
                          id={`roommate-${key}`}
                          checked={current[key]}
                          onCheckedChange={(checked) => patch({ [key]: checked })}
                        />
                      </div>
                    ))}

                    <div>
                      <Label>Cleanliness: {describe(current.cleanliness)}</Label>
                      <Slider
                        className="mt-2"
                        min={1}
                        max={5}
                        step={1}
                        value={[current.cleanliness]}
                        onValueChange={([value]) => patch({ cleanliness: value })}
                        aria-label="Cleanliness"
                      />
                    </div>
                    <div>
                      <Label>Social level: {describe(current.social_level)}</Label>
                      <Slider
                        className="mt-2"
                        min={1}
                        max={5}
                        step={1}
                        value={[current.social_level]}
                        onValueChange={([value]) => patch({ social_level: value })}
                        aria-label="Social level"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={saveProfile.isPending}>
                    {saveProfile.isPending ? 'Saving…' : 'Save profile'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          {(applications.data ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="font-medium">No requests yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Requests you send or receive will be listed here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {(applications.data ?? []).map((application) => (
                <li key={application.id}>
                  <Card>
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div>
                        <p className="font-medium">
                          {application.applicant_id === user?.id ? 'Request sent' : 'Request received'}
                        </p>
                        {application.message && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{application.message}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize">{application.status}</Badge>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function describe(value: number): string {
  return ['—', 'Very low', 'Low', 'Moderate', 'High', 'Very high'][value] ?? 'Moderate';
}
