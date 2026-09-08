import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { useSEO } from '@/lib/seo/useSEO';
import { ApiError } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Enter your full name.').max(120),
    email: z.string().min(1, 'Enter your email address.').email('Enter a valid email address.'),
    phone: z.string().max(30).optional(),
    // Mirrors the API's policy exactly (worker/src/lib/crypto.ts): length is
    // what matters, and character-composition rules are deliberately not
    // required. Diverging here would reject passwords the server accepts.
    password: z.string().min(10, 'Use at least 10 characters.').max(200),
    confirmPassword: z.string(),
    role: z.enum(['tenant', 'landlord', 'agent']),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

const ROLES = [
  { value: 'tenant', label: 'I want to rent', hint: 'Search homes, book viewings, manage a tenancy' },
  { value: 'landlord', label: 'I own property', hint: 'List units, screen tenants, track maintenance' },
  { value: 'agent', label: 'I am an agent', hint: 'Manage leads, showings and commissions' },
] as const;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useSEO({
    title: mode === 'login' ? 'Sign in' : 'Create an account',
    description:
      mode === 'login'
        ? 'Sign in to Agently to manage your tenancy, listings and maintenance requests.'
        : 'Create a free Agently account to search rentals, save listings and manage your property.',
    canonicalPath: '/auth',
    noindex: true,
  });

  // Deep links such as /auth?mode=register&role=landlord should land on the
  // right tab even after the component has mounted.
  useEffect(() => {
    setMode(searchParams.get('mode') === 'register' ? 'register' : 'login');
  }, [searchParams]);

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const defaultRole = (searchParams.get('role') as RegisterValues['role'] | null) ?? 'tenant';

  // Every hook must run on every render; the redirect therefore happens just
  // before the JSX rather than here, above the form hooks.
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: ['tenant', 'landlord', 'agent'].includes(defaultRole) ? defaultRole : 'tenant',
    },
  });

  const alreadySignedIn = !isLoading && user !== null;

  const onLogin = async (values: LoginValues) => {
    setFormError(null);
    setPending(true);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not sign you in.');
    } finally {
      setPending(false);
    }
  };

  const onRegister = async (values: RegisterValues) => {
    setFormError(null);
    setNotice(null);
    setPending(true);
    try {
      // Registration is enumeration-safe: when the address is already known the
      // API answers 202 with `{ pending_verification: true }` and no session, so
      // we must not assume a session came back.
      let pendingVerification = false;
      await register({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        ...(values.phone ? { phone: values.phone } : {}),
      }).catch((error: unknown) => {
        if (
          error instanceof ApiError &&
          error.status === 202 &&
          (error.details as { pending_verification?: boolean } | undefined)?.pending_verification
        ) {
          pendingVerification = true;
          return;
        }
        throw error;
      });

      if (pendingVerification) {
        setNotice('Check your inbox — we sent you an email to finish setting up your account.');
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not create your account.');
    } finally {
      setPending(false);
    }
  };

  if (alreadySignedIn) return <Navigate to={from} replace />;

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Agently</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Sign in to continue' : 'Create your account to get started'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={mode} onValueChange={(value) => setMode(value as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {formError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            {notice && (
              <Alert className="mt-4 border-success/30 bg-success/5">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4" noValidate>
                <div>
                  <Label htmlFor="login-email">Email address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    className="mt-1.5"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                      onClick={() => navigate('/auth?mode=reset')}
                    >
                      Forgotten your password?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    className="mt-1.5"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={pending}>
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4" noValidate>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">I am signing up as</legend>
                  <div className="grid gap-2">
                    {ROLES.map((role) => (
                      <label
                        key={role.value}
                        className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <input
                          type="radio"
                          value={role.value}
                          className="mt-1"
                          {...registerForm.register('role')}
                        />
                        <span>
                          <span className="block text-sm font-medium">{role.label}</span>
                          <span className="block text-xs text-muted-foreground">{role.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <Label htmlFor="register-name">Full name</Label>
                  <Input id="register-name" autoComplete="name" className="mt-1.5" {...registerForm.register('name')} />
                  {registerForm.formState.errors.name && (
                    <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="register-email">Email address</Label>
                  <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    className="mt-1.5"
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="register-phone">Phone (optional)</Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    autoComplete="tel"
                    className="mt-1.5"
                    {...registerForm.register('phone')}
                  />
                </div>

                <div>
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    className="mt-1.5"
                    {...registerForm.register('password')}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    At least 10 characters. A long phrase you will remember works well.
                  </p>
                  {registerForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="register-confirm">Confirm password</Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    autoComplete="new-password"
                    className="mt-1.5"
                    {...registerForm.register('confirmPassword')}
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-destructive">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={pending}>
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our{' '}
            <Link to="/terms" className="underline hover:text-foreground">Terms of service</Link> and{' '}
            <Link to="/privacy" className="underline hover:text-foreground">Privacy policy</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
