import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileCheck,
  MessagesSquare,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { JsonLd } from '@/components/common/JsonLd';
import { PropertyCard } from '@/components/PropertyCard';
import { useSEO } from '@/lib/seo/useSEO';
import { faqSchema, organisationSchema, websiteSchema } from '@/lib/seo/structuredData';
import { propertiesApi } from '@/lib/api';

const VALUE_PROPS = [
  {
    icon: BadgeCheck,
    title: 'Listings you can trust',
    body: 'Every property is verified against its address and landlord before it goes live.',
  },
  {
    icon: FileCheck,
    title: 'Agreements in one place',
    body: 'Store your lease, receipts and inspection reports and find them in seconds.',
  },
  {
    icon: Wrench,
    title: 'Maintenance that gets done',
    body: 'Raise a request, track the response and keep the full history against the property.',
  },
  {
    icon: MessagesSquare,
    title: 'Talk to the right person',
    body: 'Message your landlord, agent or contractor directly, with the thread kept for reference.',
  },
];

const STEPS = [
  { title: 'Search', body: 'Filter by city, budget, bedrooms and amenities to shortlist homes that fit.' },
  { title: 'Book a viewing', body: 'Request a slot that suits you and confirm it with the agent in-app.' },
  { title: 'Move in', body: 'Sign, store and manage everything about your tenancy from one dashboard.' },
];

const FAQS = [
  {
    question: 'What does Agently do?',
    answer:
      'Agently is a property rental platform for the Nigerian market. It connects tenants, landlords and agents, and covers the whole rental lifecycle: search, viewings, agreements, rent tracking, maintenance and move-out.',
  },
  {
    question: 'Is it free to browse properties?',
    answer: 'Yes. Searching listings and contacting agents is free for tenants.',
  },
  {
    question: 'How are listings verified?',
    answer:
      'Listings are checked against their address and linked to a verified landlord account before they are published. Listings that fail review are not shown publicly.',
  },
  {
    question: 'Which cities are covered?',
    answer:
      'Coverage grows as landlords join. Lagos, Abuja and Port Harcourt have the widest selection today.',
  },
];

export default function Home() {
  useSEO({
    title: 'Find and manage your next home in Nigeria',
    description:
      'Agently connects tenants, landlords and agents across Nigeria. Search verified rentals, book viewings, sign agreements, track maintenance and manage every property in one place.',
    canonicalPath: '/',
  });

  const featured = useQuery({
    queryKey: ['properties', 'featured'],
    queryFn: () => propertiesApi.featured(6).then((r) => r.data),
  });

  return (
    <>
      <JsonLd data={[organisationSchema(), websiteSchema(), faqSchema(FAQS)]} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-violet/10">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Verified listings across Nigeria
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Find a home you can <span className="bg-gradient-to-r from-primary to-violet bg-clip-text text-transparent">trust</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Agently brings the whole rental journey into one place — search verified properties, book
              viewings, sign agreements and track maintenance, whether you rent, own or manage.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/properties">
                  Browse properties
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth?mode=register">List your property</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value propositions */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-none bg-muted/40">
              <CardContent className="p-6">
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mb-1 font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured listings */}
      <section className="container mx-auto px-4 pb-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Featured rentals</h2>
            <p className="mt-1 text-muted-foreground">A few of the homes available right now.</p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/properties">
              See all
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {featured.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[4/3] w-full rounded-lg" />
            ))}
          </div>
        ) : featured.isError ? (
          <p className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
            We could not load featured listings right now. Please try again shortly.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(featured.data ?? []).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight">How Agently works</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative text-center md:text-left">
                <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mb-1 font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Audience split */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-8">
              <Building2 className="mb-4 h-8 w-8 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-semibold">For landlords and agents</h2>
              <p className="mt-2 text-muted-foreground">
                Publish listings, screen enquiries, manage viewings and keep every tenancy document and
                maintenance job against the right property.
              </p>
              <Button className="mt-6" variant="outline" asChild>
                <Link to="/auth?mode=register&role=landlord">Get started as a landlord</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-8">
              <ShieldCheck className="mb-4 h-8 w-8 text-accent" aria-hidden="true" />
              <h2 className="text-xl font-semibold">For tenants</h2>
              <p className="mt-2 text-muted-foreground">
                Shortlist homes, book viewings, keep your lease and receipts safe, and raise maintenance
                requests without chasing anyone over the phone.
              </p>
              <Button className="mt-6" variant="outline" asChild>
                <Link to="/properties">Start searching</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ — also emitted as FAQPage structured data */}
      <section className="container mx-auto px-4 pb-20">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <dl className="grid gap-6 md:grid-cols-2">
          {FAQS.map((faq) => (
            <div key={faq.question}>
              <dt className="font-semibold">{faq.question}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
