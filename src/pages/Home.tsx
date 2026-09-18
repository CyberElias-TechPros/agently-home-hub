import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, MapPin, Calendar, Shield, TrendingUp, Building2, Zap, ArrowRight, BadgeCheck,
  Sparkles, Wallet, Users, HeartHandshake, Star,
} from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import Reveal from '@/components/motion/Reveal';
import { useCountUp } from '@/components/motion/useCountUp';
import { apiService } from '@/lib/api';
import { Property } from '@/types';
import heroImage from '@/assets/hero-apartment.jpg';

function Stat({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect(); } },
      { threshold: 0.4 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  const animated = useCountUp(value, active);
  const display = value >= 1000 ? Math.round(animated / 100) * 100 : Math.round(animated);
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl md:text-5xl font-bold text-gradient">
        {display.toLocaleString()}{suffix ?? ''}
      </div>
      <div className="text-sm text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

const PILLARS = [
  { icon: Shield, title: 'Trust-First', body: 'KYC, verified listings and escrow-protected payments built into every transaction.' },
  { icon: Sparkles, title: 'AI-Powered', body: 'Rent prediction, tenant scoring and demand heatmaps that price every asset sharply.' },
  { icon: Wallet, title: 'Rent-as-a-Service', body: 'Monthly, split and installment rent — no more one-year upfront burden.' },
  { icon: Building2, title: 'Unified OS', body: 'Discovery → payment → legal → maintenance, orchestrated in one motion system.' },
];

const PROBLEMS = [
  { title: 'Widespread fraud & scams', body: 'Fake landlords, duplicate listings, no verification layer.', tone: 'text-red-400' },
  { title: 'Annual rent burden', body: 'One-year upfront rent and a brutal salary–rent mismatch.', tone: 'text-orange-400' },
  { title: 'Fragmented experience', body: 'Listings on one app, payments offline, leases manual, maintenance on WhatsApp.', tone: 'text-amber-400' },
  { title: 'Zero transparency', body: 'Hidden fees, no receipts, no clear cost breakdown.', tone: 'text-purple-400' },
];

const SOLUTIONS = [
  { title: 'Verified trust infrastructure', body: 'KYC + liveness, verified badges, AI fraud detection.', tone: 'text-emerald-400' },
  { title: 'Rent-as-a-Service (RaaS)', body: 'Monthly subscriptions, installment engine, shared rent.', tone: 'text-teal-400' },
  { title: 'Unified real-estate OS', body: 'Discovery → payment → legal → maintenance → analytics.', tone: 'text-blue-400' },
  { title: 'AI intelligence layer', body: 'Rent prediction, tenant scoring, pricing recommendations.', tone: 'text-violet-400' },
];

export default function Home() {
  const [featured, setFeatured] = useState<Property[]>([]);
  const [location, setLocation] = useState('');
  const [moveIn, setMoveIn] = useState('');

  useEffect(() => {
    let active = true;
    apiService.getFeaturedProperties().then((props) => {
      if (active) setFeatured(props);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const searchPath = useMemo(() => {
    const params = new URLSearchParams();
    if (location.trim()) params.set('q', location.trim());
    if (moveIn) params.set('moveIn', moveIn);
    return `/properties${params.toString() ? `?${params.toString()}` : ''}`;
  }, [location, moveIn]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Ambient gradient orbs */}
        <div className="orb w-[560px] h-[560px] -top-40 -left-32 animate-blob" style={{ background: 'hsl(213 96% 62%)' }} />
        <div className="orb w-[480px] h-[480px] top-24 -right-24 animate-blob" style={{ background: 'hsl(175 84% 58%)', animationDelay: '-5s' }} />
        <div className="orb w-[420px] h-[420px] bottom-0 left-1/3 animate-blob" style={{ background: 'hsl(271 84% 66%)', animationDelay: '-9s' }} />

        {/* Backdrop image */}
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(217_33%_7%/0.9)_100%)]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 py-24">
          <div className="max-w-3xl">
            <Reveal from="down">
              <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-sm">
                <BadgeCheck className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground">The real-estate operating system</span>
                <span className="text-accent">·</span>
                <span className="text-foreground font-medium">Category-defining</span>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.02]">
                Real estate,
                <span className="block text-gradient">reimagined in motion.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-7 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                One fluid platform that unifies property discovery, rent payments, landlord &amp; tenant
                management, agent professionalism, legal protection, fintech and trust infrastructure —
                <span className="font-editorial italic text-foreground text-2xl"> beautifully orchestrated.</span>
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-10 glass-strong rounded-2xl p-3 shadow-xl max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/60 rounded-xl">
                    <MapPin className="h-5 w-5 text-accent shrink-0" />
                    <Input
                      placeholder="City, neighborhood, address…"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-base"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/60 rounded-xl">
                    <Calendar className="h-5 w-5 text-accent shrink-0" />
                    <Input
                      type="date"
                      value={moveIn}
                      onChange={(e) => setMoveIn(e.target.value)}
                      className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
                    />
                  </div>
                  <Link to={searchPath}>
                    <Button className="btn-cinematic w-full sm:w-auto h-12 px-6 text-base">
                      <Search className="mr-2 h-4 w-4" />
                      Discover
                    </Button>
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-8 flex flex-wrap gap-3">
                {['Verified listings', 'Escrow protected', 'Flexible installments'].map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" /> {chip}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </div>

        {/* Bottom hairline */}
        <div className="absolute bottom-0 left-0 right-0 hairline" />
      </section>

      {/* ================= MARQUEE ================= */}
      <section className="border-y border-border/50 bg-secondary/20 py-5 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee gap-12 text-sm uppercase tracking-[0.25em] text-muted-foreground/70 font-medium">
          {[
            'Verified Listings', 'Rent-as-a-Service', 'Escrow Payments', 'AI Pricing', 'Digital Leases',
            'Roommate Matching', 'Maintenance OS', 'Agent CRM', 'Neighborhood Intelligence',
          ].flatMap((word) => [word, word]).map((word, i) => (
            <span key={i} className="flex items-center gap-12">
              <span>{word}</span>
              <Star className="h-3 w-3 text-accent/60 fill-current" />
            </span>
          ))}
        </div>
      </section>

      {/* ================= PILLARS ================= */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="max-w-2xl mb-16">
              <span className="eyebrow">Why Agently</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold mt-3">
                An entire market, <span className="text-gradient-teal">composed into one instrument.</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <div className="card-cinematic ring-hover rounded-2xl p-7 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-hero/10 ring-1 ring-primary/20 flex items-center justify-center mb-5">
                    <p.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">{p.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PROBLEM / SOLUTION ================= */}
      <section className="py-24 bg-secondary/10 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 max-w-6xl mx-auto">
            <Reveal from="left">
              <div>
                <span className="eyebrow text-red-400">The friction</span>
                <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 mb-8">Real estate is still running on paper.</h2>
                <div className="space-y-4">
                  {PROBLEMS.map((p) => (
                    <div key={p.title} className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                      <span className={`mt-1.5 w-2 h-2 rounded-full ${p.tone}`} />
                      <div>
                        <h4 className="font-semibold capitalize">{p.title}</h4>
                        <p className="text-sm text-muted-foreground">{p.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal from="right" delay={100}>
              <div>
                <span className="eyebrow">The answer</span>
                <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 mb-8">Agently removes every moving part.</h2>
                <div className="space-y-4">
                  {SOLUTIONS.map((s) => (
                    <div key={s.title} className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <span className={`mt-1.5 w-2 h-2 rounded-full ${s.tone}`} />
                      <div>
                        <h4 className="font-semibold capitalize">{s.title}</h4>
                        <p className="text-sm text-muted-foreground">{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto glass rounded-3xl px-8 py-14 shadow-xl relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              <Stat value={10240} suffix="+" label="Verified listings" />
              <Stat value={5280} suffix="+" label="Happy tenants" />
              <Stat value={2600} suffix="+" label="Professional agents" />
              <Stat value={54} suffix="+" label="Cities covered" />
            </div>
          </div>
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <Reveal>
              <div className="max-w-xl">
                <span className="eyebrow">The complete OS</span>
                <h2 className="font-display text-4xl md:text-5xl font-bold mt-3">
                  Every layer of the value chain, <span className="text-gradient">unified.</span>
                </h2>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <Link to="/properties">
                <Button variant="outline" size="lg" className="group">
                  Explore properties
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'For tenants', badge: 'bg-primary', items: ['Verified listings only', 'Monthly & installment rent', 'Digital leases & receipts', 'Maintenance tracking', 'Roommate matching'] },
              { icon: Building2, title: 'For landlords', badge: 'bg-accent', items: ['Property & unit management', 'Tenant onboarding & screening', 'Automated rent collection', 'Payment dashboards', 'Financial reports'] },
              { icon: Shield, title: 'For agents', badge: 'bg-violet', items: ['KYC-verified onboarding', 'Certification academy', 'CRM & lead management', 'Commission tracking', 'Public professional profiles'] },
            ].map((col, i) => (
              <Reveal key={col.title} delay={i * 100}>
                <div className="card-cinematic rounded-2xl p-7 h-full">
                  <div className={`w-12 h-12 rounded-2xl ${col.badge} text-white flex items-center justify-center mb-5`}>
                    <col.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-4">{col.title}</h3>
                  <ul className="space-y-3">
                    {col.items.map((it) => (
                      <li key={it} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <BadgeCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Reveal>
              <div className="card-cinematic rounded-2xl p-8 relative overflow-hidden">
                <div className="orb w-64 h-64 -right-10 -top-10" style={{ background: 'hsl(213 96% 62%)', opacity: 0.35 }} />
                <TrendingUp className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-display text-2xl font-semibold mb-2">AI Intelligence Layer</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Rent prediction, tenant scoring, demand heatmaps and pricing recommendations that keep
                  every asset sharper than the market.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="card-cinematic rounded-2xl p-8 relative overflow-hidden">
                <div className="orb w-64 h-64 -right-10 -top-10" style={{ background: 'hsl(175 84% 58%)', opacity: 0.35 }} />
                <HeartHandshake className="h-8 w-8 text-accent mb-4" />
                <h3 className="font-display text-2xl font-semibold mb-2">Verified Trust Infrastructure</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  KYC + liveness checks, verified listing badges, escrow services and legal protection on
                  every single transaction.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= FEATURED PROPERTIES ================= */}
      <section className="py-24 bg-secondary/10 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Reveal>
              <span className="eyebrow">Featured</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold mt-3">
                Hand-picked homes, <span className="font-editorial italic text-gradient-gold">ready for you.</span>
              </h2>
            </Reveal>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {featured.slice(0, 3).map((property, i) => (
              <Reveal key={property.id} delay={i * 90}>
                <PropertyCard property={property} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden p-10 md:p-20 text-center shadow-xl">
              <div className="absolute inset-0 -z-10" style={{ background: 'var(--gradient-hero)' }} />
              <div className="orb w-80 h-80 -top-24 -left-10 opacity-40" />
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(217_33%_7%/0.45)_100%)]" />

              <div className="max-w-2xl mx-auto">
                <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight">
                  Ready to experience the future of real estate?
                </h2>
                <p className="mt-5 text-white/85 text-lg">
                  Join a generation of tenants, landlords and agents who moved off paper — and into motion.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/auth">
                    <Button size="lg" className="bg-white text-foreground hover:bg-white/90 h-13 px-8 text-base shadow-xl">
                      Get started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/properties">
                    <Button size="lg" variant="outline" className="bg-transparent border-white/60 text-white hover:bg-white/10 h-13 px-8 text-base">
                      Explore properties
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
