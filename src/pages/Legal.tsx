import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Shield, ScrollText, Send, Mail, MapPin, Phone, Clock, CheckCircle } from 'lucide-react';
import { supportApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface LegalProps { page: 'privacy' | 'terms' | 'contact' }

const PRIVACY_SECTIONS = [
  { title: 'Information we collect', body: 'When you use Agently, we collect the information you provide directly — your name, email address, phone number, property listings, documents, and payment details — together with automatically collected data such as device type, IP address, and usage analytics.' },
  { title: 'How we use your information', body: 'We use your information to operate the platform, verify your identity, match you with properties and professionals, process payments securely through our payment partners, prevent fraud, and communicate important service updates.' },
  { title: 'Payment information', body: 'Payments are processed in Naira (₦) by licensed payment providers. We never store your full card details on our servers; sensitive payment data is handled by our PCI-compliant partners.' },
  { title: 'Data sharing', body: 'We share limited information only as needed: with landlords or tenants for a requested tenancy, with vendors for a booked service, with regulators where required by Nigerian law (including the NDPR), and with service providers who help us operate the platform.' },
  { title: 'Your rights', body: 'Under the Nigeria Data Protection Regulation, you may request access to, correction of, or deletion of your personal data at any time. Contact privacy@agently.ng and we will respond within the statutory timeframe.' },
  { title: 'Data retention & security', body: 'We retain your data only as long as necessary to provide the service and meet legal obligations. Access is protected with encryption in transit and at rest, role-based access controls, and continuous monitoring.' },
];

const TERMS_SECTIONS = [
  { title: 'Acceptance of terms', body: 'By creating an account or using Agently, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the platform.' },
  { title: 'Eligibility', body: 'You must be at least 18 years old and able to form a binding contract to use Agently. By registering, you confirm the information you provide is accurate and current.' },
  { title: 'Platform role', body: 'Agently provides a marketplace connecting tenants, landlords, agents, and service professionals. We facilitate introductions and transactions but are not a party to any tenancy agreement unless explicitly stated in writing.' },
  { title: 'Listings & content', body: 'Listings and content you publish must be accurate, lawful, and must not infringe third-party rights. We may remove content that violates these terms or applicable Nigerian law.' },
  { title: 'Payments & fees', body: 'All amounts are denominated in Naira (₦). Payments are processed through licensed providers, and any applicable service fees are displayed before you confirm a transaction.' },
  { title: 'Liability', body: 'To the maximum extent permitted by law, Agently is not liable for indirect or consequential damages. Our total liability is limited to the fees you have paid us in the preceding three months.' },
];

export default function Legal({ page }: LegalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.subject || !form.message) {
      toast({ title: 'Missing details', description: 'Please fill in your email, subject and message.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await supportApi.create({ subject: form.subject, message: form.message, category: 'general' });
      setSent(true);
      toast({ title: 'Message received', description: 'Our support team will respond shortly.' });
    } catch (err: any) {
      toast({ title: 'Could not send', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (page === 'contact') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Contact Us</h1>
          <p className="text-muted-foreground text-lg">We typically respond within one business day.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3 mb-12">
          {[
            { icon: Mail, title: 'Email', lines: ['hello@agently.ng', 'support@agently.ng'] },
            { icon: Phone, title: 'Phone & WhatsApp', lines: ['+234 800 000 0000', 'Mon–Sat, 8am–6pm WAT'] },
            { icon: MapPin, title: 'Head Office', lines: ['Lagos, Nigeria', 'Serving all 36 states + FCT'] },
          ].map((c) => (
            <Card key={c.title}>
              <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                <c.icon className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold">{c.title}</h3>
                {c.lines.map((l) => <p key={l} className="text-sm text-muted-foreground">{l}</p>)}
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>Send us a message</CardTitle></CardHeader>
          <CardContent>
            {sent ? (
              <div className="py-10 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Message sent!</h3>
                <p className="text-muted-foreground mb-6">Our support team will get back to you at {form.email}.</p>
                <Button variant="outline" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>Send another</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Your name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Adeola Johnson" /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
                </div>
                <div className="space-y-2"><Label>Subject</Label><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="How can we help?" /></div>
                <div className="space-y-2"><Label>Message</Label><Textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your enquiry…" /></div>
                <Button type="submit" disabled={sending}>{sending ? 'Sending…' : <><Send className="h-4 w-4 mr-2" /> Send message</>}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPrivacy = page === 'privacy';
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
          {isPrivacy ? <Shield className="h-7 w-7 text-primary" /> : <ScrollText className="h-7 w-7 text-primary" />}
        </div>
        <h1 className="text-4xl font-bold mb-3">{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h1>
        <p className="text-muted-foreground">Agently Home Hub · Last updated 16 September 2026</p>
      </div>
      <div className="space-y-4">
        {sections.map((s, i) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">{s.body}</CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
        <Clock className="h-4 w-4" /> Questions? <Link to="/contact" className="text-primary hover:underline">Contact our team</Link>
      </div>
    </div>
  );
}

export function Privacy() { return <Legal page="privacy" />; }
export function Terms() { return <Legal page="terms" />; }
export function Contact() { return <Legal page="contact" />; }
