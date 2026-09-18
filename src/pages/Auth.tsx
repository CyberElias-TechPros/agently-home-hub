import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, BadgeCheck, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import Reveal from '@/components/motion/Reveal';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['tenant', 'landlord', 'agent', 'manager'], {
    required_error: 'Please select a role',
  }),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const ROLES = [
  { value: 'tenant', label: 'Tenant — I want to find a home' },
  { value: 'landlord', label: 'Landlord — I own property' },
  { value: 'agent', label: 'Agent — I sell & let property' },
  { value: 'manager', label: 'Manager — I run a portfolio' },
];

function VerifyPanel({ onBack }: { onBack: () => void }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get('verify') ?? searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setError('No verification token found in this link.');
      return;
    }
    let active = true;
    verifyEmail(token)
      .then(() => {
        if (active) setDone(true);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Verification failed');
      })
      .finally(() => {
        if (active) setVerifying(false);
      });
    return () => {
      active = false;
    };
  }, [token, verifyEmail]);

  return (
    <Card className="border-0 card-cinematic shadow-xl">
      <CardHeader className="text-center pt-10">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/15 ring-1 ring-accent/30 flex items-center justify-center mb-4">
          {done ? <BadgeCheck className="h-8 w-8 text-accent" /> : <Mail className="h-8 w-8 text-primary" />}
        </div>
        <CardTitle className="font-display text-2xl">{done ? 'Email verified' : 'Verifying your email…'}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {verifying ? (
            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirming your token</span>
          ) : done ? (
            'Your account is active. Sign in to continue.'
          ) : (
            error ?? 'Something went wrong.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-10">
        <div className="flex flex-col gap-3">
          {done ? (
            <Button className="btn-cinematic" onClick={() => navigate('/auth')}>
              Continue to sign in <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button className="btn-cinematic" onClick={() => navigate('/auth')}>Back to sign in</Button>
              <Button variant="ghost" onClick={onBack}>Start over</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Auth() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [mode, setMode] = useState<'auth' | 'verify' | 'registered'>('auth');
  const [sentTo, setSentTo] = useState<string>('');
  const [verifyUrl, setVerifyUrl] = useState<string>('');
  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const resetToken = searchParams.get('reset');

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', role: 'tenant' },
  });

  const onLogin = async (data: LoginForm) => {
    try {
      await login({ email: data.email!, password: data.password! });
      navigate('/dashboard');
    } catch {
      /* handled by hook toast */
    }
  };

  const onRegister = async (data: RegisterForm) => {
    try {
      const result = await register({
        name: data.name!,
        email: data.email!,
        password: data.password!,
        role: data.role as RegisterForm['role'],
      } as any);
      setSentTo(result.sentTo ?? data.email);
      setVerifyUrl(result.verifyUrl ?? '');
      setMode('registered');
    } catch {
      /* handled by hook toast */
    }
  };

  // If we landed on a reset/verify link, show the right panel.
  if (resetToken) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
        <div className="orb w-[420px] h-[420px] -top-24 -left-24" style={{ background: 'hsl(213 96% 62%)' }} />
        <div className="orb w-[380px] h-[380px] -bottom-24 -right-24" style={{ background: 'hsl(175 84% 58%)' }} />
        <div className="w-full max-w-md z-10">
          <ResetPassword token={resetToken} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="orb w-[460px] h-[460px] -top-28 -left-28 animate-blob" style={{ background: 'hsl(213 96% 62%)' }} />
      <div className="orb w-[420px] h-[420px] -bottom-28 -right-28 animate-blob" style={{ background: 'hsl(175 84% 58%)', animationDelay: '-6s' }} />
      <div className="orb w-[320px] h-[320px] top-1/3 right-10 animate-blob" style={{ background: 'hsl(271 84% 66%)', animationDelay: '-3s' }} />

      <div className="w-full max-w-md z-10">
        <Reveal from="down">
          <Link to="/" className="flex items-center justify-center gap-2 mb-8">
            <Building2 className="h-10 w-10 text-primary" />
            <span className="text-3xl font-display font-bold text-gradient">Agently</span>
          </Link>
        </Reveal>

        <Reveal delay={80}>
          {mode === 'verify' ? (
            <VerifyPanel onBack={() => setMode('auth')} />
          ) : mode === 'registered' ? (
            <Card className="border-0 card-cinematic shadow-xl">
              <CardHeader className="text-center pt-10">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="font-display text-2xl">Check your inbox</CardTitle>
                <CardDescription className="text-muted-foreground">
                  We sent a verification link to <span className="text-foreground font-medium">{sentTo}</span>.
                  Click it to activate your account, then sign in.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-10 text-center">
                {verifyUrl && (
                  <a
                    href={verifyUrl}
                    className="inline-flex items-center gap-2 text-sm text-accent underline underline-offset-4 hover:text-accent/80 mb-4"
                  >
                    Open verification link <ArrowRight className="h-4 w-4" />
                  </a>
                )}
                <div className="flex flex-col gap-3">
                  <Button className="btn-cinematic" onClick={() => setActiveTab('signin')}>
                    I've verified — sign in
                  </Button>
                  <Button variant="ghost" onClick={() => setMode('auth')}>Back to sign up</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 card-cinematic shadow-xl">
              <CardHeader className="text-center pt-8">
                <CardTitle className="font-display text-2xl">Welcome</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Sign in to your account or create a new one
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <Field
                        id="email"
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        error={loginForm.formState.errors.email?.message}
                        {...loginForm.register('email')}
                      />
                      <Field
                        id="password"
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        error={loginForm.formState.errors.password?.message}
                        {...loginForm.register('password')}
                      />
                      <Button type="submit" className="btn-cinematic w-full h-12" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sign In
                      </Button>
                      <div className="text-center pt-2 text-sm text-muted-foreground">
                        Try the demo: <span className="text-foreground">tenant@agently.dev</span> / <span className="text-foreground">Password123!</span>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <Field
                        id="name"
                        label="Full name"
                        placeholder="Ada Okonkwo"
                        error={registerForm.formState.errors.name?.message}
                        {...registerForm.register('name')}
                      />
                      <Field
                        id="signup-email"
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        error={registerForm.formState.errors.email?.message}
                        {...registerForm.register('email')}
                      />
                      <Field
                        id="signup-password"
                        label="Password"
                        type="password"
                        placeholder="At least 8 characters"
                        error={registerForm.formState.errors.password?.message}
                        {...registerForm.register('password')}
                      />
                      <div>
                        <Label htmlFor="role" className="mb-2 block">I am a…</Label>
                        <Select
                          value={registerForm.watch('role')}
                          onValueChange={(v) => registerForm.setValue('role', v as RegisterForm['role'])}
                        >
                          <SelectTrigger className={registerForm.formState.errors.role ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {registerForm.formState.errors.role && (
                          <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.role.message}</p>
                        )}
                      </div>
                      <Button type="submit" className="btn-cinematic w-full h-12" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Create Account
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </Reveal>
      </div>
    </div>
  );
}

function Field({ id, label, type, placeholder, error, ...register }: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  [k: string]: any;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2 block">{label}</Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        className={error ? 'border-destructive' : ''}
        {...register}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

function ResetPassword({ token }: { token: string }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const schema = useMemo(() => z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string().min(8, 'Please confirm your password'),
  }).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] }), []);
  const form = useForm<{ password: string; confirm: string }>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (data: { password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { authService } = await import('@/lib/auth');
      await authService.resetPassword(token, data.password);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Card className="border-0 card-cinematic shadow-xl">
        <CardHeader className="text-center pt-10">
          <BadgeCheck className="mx-auto h-10 w-10 text-accent mb-3" />
          <CardTitle className="font-display text-2xl">Password updated</CardTitle>
          <CardDescription>Sign in with your new password.</CardDescription>
        </CardHeader>
        <CardContent className="pb-10 text-center">
          <Button className="btn-cinematic" onClick={() => navigate('/auth')}>Back to sign in</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 card-cinematic shadow-xl">
      <CardHeader className="text-center pt-10">
        <CardTitle className="font-display text-2xl">Create a new password</CardTitle>
        <CardDescription className="text-muted-foreground">Choose a strong password for your account.</CardDescription>
      </CardHeader>
      <CardContent className="pb-10">
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <Field id="rp-pass" label="New password" type="password" placeholder="••••••••" error={form.formState.errors.password?.message} {...form.register('password')} />
          <Field id="rp-confirm" label="Confirm password" type="password" placeholder="••••••••" error={form.formState.errors.confirm?.message} {...form.register('confirm')} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="btn-cinematic w-full h-12" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
