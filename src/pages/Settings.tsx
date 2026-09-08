import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useSEO } from '@/lib/seo/useSEO';
import { profileApi } from '@/lib/api';

const profileSchema = z.object({
  name: z.string().min(2, 'Enter your name.').max(120),
  phone: z.string().max(30, 'That phone number is too long.').optional(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password.'),
    new_password: z.string().min(10, 'Use at least 10 characters.').max(200),
    confirm_password: z.string(),
  })
  .refine((value) => value.new_password === value.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function Settings() {
  useSEO({ title: 'Account settings', description: 'Manage your Agently account details and password.', canonicalPath: '/settings', noindex: true });

  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then((r) => r.data.user),
    initialData: user ?? undefined,
  });

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: profile.data?.name ?? '',
      phone: profile.data?.phone ?? '',
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });

  const saveProfile = useMutation({
    mutationFn: (values: ProfileValues) => profileApi.update(values),
    onSuccess: () => {
      toast({ title: 'Profile updated' });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: Error) =>
      toast({ title: 'Could not update profile', description: error.message, variant: 'destructive' }),
  });

  const changePassword = useMutation({
    mutationFn: (values: PasswordValues) =>
      profileApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      }),
    onSuccess: () => {
      toast({
        title: 'Password changed',
        description: 'You have been signed out of every other device.',
      });
      passwordForm.reset();
    },
    onError: (error: Error) =>
      toast({ title: 'Could not change password', description: error.message, variant: 'destructive' }),
  });

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Account settings</h1>
      <p className="mb-8 text-muted-foreground">Manage your details and keep your account secure.</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>This is how your name appears to landlords, tenants and agents.</CardDescription>
          </CardHeader>
          <CardContent>
            {profile.isLoading && !profile.data ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <form
                onSubmit={profileForm.handleSubmit((values) => saveProfile.mutate(values))}
                className="space-y-4"
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="settings-name">Full name</Label>
                    <Input id="settings-name" className="mt-1.5" {...profileForm.register('name')} />
                    {profileForm.formState.errors.name && (
                      <p className="mt-1 text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="settings-phone">Phone number</Label>
                    <Input id="settings-phone" type="tel" className="mt-1.5" {...profileForm.register('phone')} />
                    {profileForm.formState.errors.phone && (
                      <p className="mt-1 text-sm text-destructive">{profileForm.formState.errors.phone.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="settings-email">Email address</Label>
                  <Input id="settings-email" value={profile.data?.email ?? ''} disabled className="mt-1.5" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your email address cannot be changed here.
                  </p>
                </div>
                <Button type="submit" disabled={saveProfile.isPending}>
                  {saveProfile.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Password</CardTitle>
            <CardDescription>
              Changing your password signs you out of every other device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit((values) => changePassword.mutate(values))}
              className="space-y-4"
              noValidate
            >
              <div>
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  className="mt-1.5"
                  {...passwordForm.register('current_password')}
                />
                {passwordForm.formState.errors.current_password && (
                  <p className="mt-1 text-sm text-destructive">
                    {passwordForm.formState.errors.current_password.message}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    className="mt-1.5"
                    {...passwordForm.register('new_password')}
                  />
                  {passwordForm.formState.errors.new_password && (
                    <p className="mt-1 text-sm text-destructive">
                      {passwordForm.formState.errors.new_password.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className="mt-1.5"
                    {...passwordForm.register('confirm_password')}
                  />
                  {passwordForm.formState.errors.confirm_password && (
                    <p className="mt-1 text-sm text-destructive">
                      {passwordForm.formState.errors.confirm_password.message}
                    </p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? 'Updating…' : 'Change password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sessions</CardTitle>
            <CardDescription>Sign out of this device, or every device you have used.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => logout(false)}>
              Sign out of this device
            </Button>
            <Button variant="outline" onClick={() => logout(true)}>
              Sign out everywhere
            </Button>
          </CardContent>
        </Card>
      </div>
      <Separator className="my-8" />
    </div>
  );
}
