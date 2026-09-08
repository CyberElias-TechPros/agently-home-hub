import { Link } from 'react-router-dom';
import { BadgeCheck, Building2, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/common/JsonLd';
import { useSEO } from '@/lib/seo/useSEO';
import { breadcrumbSchema, organisationSchema } from '@/lib/seo/structuredData';

export default function About() {
  useSEO({
    title: 'About Agently',
    description:
      'Agently is building the operating system for renting in Nigeria — connecting tenants, landlords and agents with verified listings, tracked maintenance and secure agreements.',
    canonicalPath: '/about',
  });

  return (
    <>
      <JsonLd
        data={[
          organisationSchema(),
          breadcrumbSchema([
            { name: 'Home', url: 'https://agently.app/' },
            { name: 'About', url: 'https://agently.app/about' },
          ]),
        ]}
      />

      <div className="container mx-auto px-4 py-16">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight">Renting in Nigeria, made to work</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Finding a home should not depend on who you know. Agently brings search, agreements,
            maintenance and payments into one place so tenants, landlords and agents can all see the
            same truth.
          </p>
        </header>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Trust first',
              body: 'Listings are verified against their address and linked to a verified owner before they go live.',
            },
            {
              icon: Users,
              title: 'Fair for both sides',
              body: 'Tenants get transparency and a record. Landlords get screened enquiries and a paper trail.',
            },
            {
              icon: Building2,
              title: 'Built for this market',
              body: 'Naira pricing, Nigerian addresses and the realities of the local rental market are the default, not an afterthought.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardContent className="p-6">
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mb-1 font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-16 rounded-xl bg-muted/40 p-8 md:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <BadgeCheck className="mx-auto mb-4 h-8 w-8 text-accent" aria-hidden="true" />
            <h2 className="text-2xl font-bold tracking-tight">Get started</h2>
            <p className="mt-2 text-muted-foreground">
              Whether you are looking for somewhere to live or managing a portfolio, Agently gives you
              the same clear view.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/properties">Browse properties</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
