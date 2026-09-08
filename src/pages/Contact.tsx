import { useState } from 'react';
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSEO } from '@/lib/seo/useSEO';

export default function Contact() {
  useSEO({
    title: 'Contact us',
    description:
      'Get in touch with the Agently team for support, listings or partnerships.',
    canonicalPath: '/contact',
  });

  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  // There is no public contact endpoint in the API; submissions open the
  // visitor's mail client so the message actually reaches a human.
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Agently enquiry from ${form.name}`);
    const body = encodeURIComponent(`${form.message}

— ${form.name} (${form.email})`);
    window.location.href = `mailto:hello@agently.app?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Contact us</h1>
        <p className="mt-3 text-muted-foreground">
          Questions about a listing, your account, or partnering with us — we would like to hear from
          you.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <Mail className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">Email</p>
                <a href="mailto:hello@agently.app" className="text-sm text-muted-foreground hover:text-foreground">
                  hello@agently.app
                </a>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <Phone className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">Support</p>
                <p className="text-sm text-muted-foreground">Monday to Friday, 9am – 6pm WAT</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <MapPin className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">Lagos</p>
                <p className="text-sm text-muted-foreground">Lagos, Nigeria</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            {sent ? (
              <Alert className="border-success/30 bg-success/5">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                <AlertDescription>
                  Thanks — your email client should have opened with your message ready to send.
                </AlertDescription>
              </Alert>
            ) : (
              <form className="space-y-4" onSubmit={submit}>
                <div>
                  <Label htmlFor="contact-name">Your name</Label>
                  <Input
                    id="contact-name"
                    required
                    className="mt-1.5"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email address</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    required
                    className="mt-1.5"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-message">How can we help?</Label>
                  <Textarea
                    id="contact-message"
                    rows={5}
                    required
                    className="mt-1.5"
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Send message
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
