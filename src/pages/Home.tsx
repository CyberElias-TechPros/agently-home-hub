import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Calendar, Users, Shield, TrendingUp, Building2, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import PropertyCard from '@/components/PropertyCard';
import { mockProperties } from '@/lib/mockData';
import heroImage from '@/assets/hero-apartment.jpg';
import AdContainer from '@/components/AdContainer';

export default function Home() {
  const featuredProperties = mockProperties.filter(p => p.featured);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Modern apartment interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        </div>

        <div className="container mx-auto px-4 z-10">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-hero text-white px-3 py-1 rounded-full text-sm font-medium">
                Category-Defining
              </div>
              <div className="bg-gradient-accent text-white px-3 py-1 rounded-full text-sm font-medium">
                AI-Powered
              </div>
              <div className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                Trust-First
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in">
              Real Estate,
              <span className="block bg-gradient-hero bg-clip-text text-transparent">
                Reimagined
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 animate-slide-up leading-relaxed">
              A world-class digital real-estate operating system that unifies property discovery,
              rental payments, landlord & tenant management, agent professionalism, legal protection,
              fintech, and trust infrastructure into one elegant platform.
            </p>

            {/* Value Proposition Badges */}
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Verified Trust Infrastructure</span>
              </div>
              <div className="flex items-center gap-2 bg-gradient-accent/10 text-accent-foreground px-4 py-2 rounded-full">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">AI Intelligence Layer</span>
              </div>
              <div className="flex items-center gap-2 bg-gradient-hero/10 text-primary px-4 py-2 rounded-full">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">10x Broader Than Competitors</span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-card p-3 sm:p-4 rounded-lg shadow-xl animate-scale-in max-w-4xl mx-auto border border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="sm:col-span-2 lg:col-span-2 flex items-center gap-2 px-3 py-2 bg-background rounded-md">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  <Input
                    placeholder="City, neighborhood, or address"
                    className="border-0 p-0 h-auto focus-visible:ring-0 text-sm sm:text-base"
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-md">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="date"
                    placeholder="Move-in date"
                    className="border-0 p-0 h-auto focus-visible:ring-0 text-sm sm:text-base"
                  />
                </div>
                <Link to="/properties" className="w-full sm:col-span-3 lg:col-span-1">
                  <Button className="w-full h-full bg-gradient-hero hover:opacity-90 min-h-[44px] text-sm sm:text-base shadow-lg">
                    <Search className="mr-2 h-4 w-4" />
                    Discover Properties
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Summary Section */}
      <section className="py-16 bg-gradient-to-br from-background via-background/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Executive Summary</h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                Agently is a next-generation, AI-powered real-estate operating system built to solve
                deep structural problems in the Nigerian real-estate market and scale globally.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-6 text-primary">The Problem</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50/50 dark:bg-red-900/20 rounded-lg border border-red-200/50">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold">Widespread Fraud & Scams</h4>
                      <p className="text-sm text-muted-foreground">Fake landlords & agents, duplicate listings, no trusted verification layer</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-orange-50/50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold">Annual Rent Burden</h4>
                      <p className="text-sm text-muted-foreground">One-year upfront rent, financial strain on tenants, salary-rent mismatch</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-yellow-50/50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200/50">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold">Fragmented Process</h4>
                      <p className="text-sm text-muted-foreground">Listings on one platform, payments offline, leases manual, maintenance on WhatsApp</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-purple-50/50 dark:bg-purple-900/20 rounded-lg border border-purple-200/50">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold">Zero Transparency</h4>
                      <p className="text-sm text-muted-foreground">Hidden fees, no receipts, no clear cost breakdown</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-6 text-green-600">The Solution</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-green-50/50 dark:bg-green-900/20 rounded-lg border border-green-200/50">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold">Verified Trust Infrastructure</h4>
                      <p className="text-sm text-muted-foreground">KYC + liveness checks, verified listings badge, AI fraud detection</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold">Rent-as-a-Service (RaaS)</h4>
                      <p className="text-sm text-muted-foreground">Monthly rent subscriptions, installment engine, shared rent (roommates)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200/50">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold">Unified Real-Estate OS</h4>
                      <p className="text-sm text-muted-foreground">Discovery → Payment → Legal → Maintenance → Analytics</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-violet-50/50 dark:bg-violet-900/20 rounded-lg border border-violet-200/50">
                    <div className="w-2 h-2 bg-violet-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold">AI Intelligence Layer</h4>
                      <p className="text-sm text-muted-foreground">Rent prediction, tenant scoring, demand heatmaps, pricing recommendations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Opportunity Section */}
      <section className="py-16 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Market Opportunity</h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                A $100B+ global rental & property management market with massive untapped potential
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-card rounded-xl shadow-lg">
                <div className="text-4xl font-bold text-primary mb-4">Nigeria</div>
                <div className="text-2xl font-semibold mb-4">200M+ Population</div>
                <div className="space-y-2 text-muted-foreground">
                  <div>95M+ renters</div>
                  <div>Multi-billion dollar informal rental economy</div>
                  <div>High smartphone penetration</div>
                </div>
              </div>

              <div className="text-center p-8 bg-card rounded-xl shadow-lg">
                <div className="text-4xl font-bold text-accent mb-4">Africa</div>
                <div className="text-2xl font-semibold mb-4">Rapid Urbanization</div>
                <div className="space-y-2 text-muted-foreground">
                  <div>Severe housing deficits</div>
                  <div>Young, tech-savvy population</div>
                  <div>Massive growth potential</div>
                </div>
              </div>

              <div className="text-center p-8 bg-card rounded-xl shadow-lg">
                <div className="text-4xl font-bold text-violet-600 mb-4">Global</div>
                <div className="text-2xl font-semibold mb-4">$100B+ TAM</div>
                <div className="space-y-2 text-muted-foreground">
                  <div>Same pain points in LATAM, SE Asia, Eastern Europe</div>
                  <div>Category-defining opportunity</div>
                  <div>Scalable infrastructure</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-r from-primary/90 to-accent/90 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-sm opacity-90">Verified Listings</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5,000+</div>
              <div className="text-sm opacity-90">Happy Tenants</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">2,500+</div>
              <div className="text-sm opacity-90">Professional Agents</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-sm opacity-90">Cities Covered</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Showcase */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete Real-Estate OS</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Every layer of the real-estate value chain, unified in one platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* For Tenants */}
            <div className="bg-card p-6 rounded-xl shadow-lg border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-hero rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">For Tenants</h3>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full"></span> Verified listings only</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full"></span> Monthly/quarterly/annual rent options</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full"></span> Installment payments</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full"></span> Transparent cost breakdown</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full"></span> Digital leases & receipts</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full"></span> Maintenance tracking</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full"></span> Roommate matching</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full"></span> Virtual property tours</li>
              </ul>
            </div>

            {/* For Landlords */}
            <div className="bg-card p-6 rounded-xl shadow-lg border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold">For Landlords</h3>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-accent rounded-full"></span> Property & unit management</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-accent rounded-full"></span> Tenant onboarding & screening</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-accent rounded-full"></span> Automated rent collection</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-accent rounded-full"></span> Payment dashboards</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-accent rounded-full"></span> Maintenance workflows</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-accent rounded-full"></span> Financial reports</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-accent rounded-full"></span> Vacancy & listing tools</li>
              </ul>
            </div>

            {/* For Agents */}
            <div className="bg-card p-6 rounded-xl shadow-lg border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold">For Agents</h3>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-violet-500 rounded-full"></span> Verified onboarding (KYC)</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-violet-500 rounded-full"></span> Certification academy</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-violet-500 rounded-full"></span> CRM & lead management</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-violet-500 rounded-full"></span> Commission tracking</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-violet-500 rounded-full"></span> Public professional profiles</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* AI Intelligence */}
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-6 rounded-xl shadow-lg border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold">AI Intelligence Layer</h3>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Rent prediction</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Tenant scoring</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Demand heatmaps</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Pricing recommendations</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Market insights</li>
              </ul>
            </div>

            {/* Trust Infrastructure */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 rounded-xl shadow-lg border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Verified Trust Infrastructure</h3>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> KYC + liveness checks</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Verified listings badge</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> AI fraud detection</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Escrow services</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Legal protection</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Properties</h2>
            <p className="text-muted-foreground text-lg">
              Hand-picked properties that meet our quality standards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          <div className="text-center">
            <Link to="/properties">
              <Button size="lg" variant="outline">
                View All Properties
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gradient-to-br from-background via-background/50 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Agently?</h2>
            <p className="text-muted-foreground text-lg">Built for the future of real estate</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-card rounded-xl shadow-lg border border-border/50">
              <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Discovery</h3>
              <p className="text-muted-foreground">
                Smart matching, predictive insights, and intelligent recommendations
              </p>
            </div>

            <div className="text-center p-6 bg-card rounded-xl shadow-lg border border-border/50">
              <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Trust-First Platform</h3>
              <p className="text-muted-foreground">
                Verified users, secure transactions, and fraud protection
              </p>
            </div>

            <div className="text-center p-6 bg-card rounded-xl shadow-lg border border-border/50">
              <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">10x Broader Than Competitors</h3>
              <p className="text-muted-foreground">
                Complete real-estate OS, not just listings or payments
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Vision</h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Agently aims to become <strong className="text-primary">the default digital infrastructure for housing across Africa and beyond</strong>.
              Where trust is built-in, rent is affordable, and real estate finally works.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="bg-card p-6 rounded-xl shadow-lg border border-border/50">
                <div className="text-4xl font-bold text-primary mb-2">Trust Built-In</div>
                <p className="text-sm text-muted-foreground">Every transaction, every interaction, verified and secure</p>
              </div>
              <div className="bg-card p-6 rounded-xl shadow-lg border border-border/50">
                <div className="text-4xl font-bold text-accent mb-2">Rent Affordable</div>
                <p className="text-sm text-muted-foreground">Flexible payment options that work for modern life</p>
              </div>
              <div className="bg-card p-6 rounded-xl shadow-lg border border-border/50">
                <div className="text-4xl font-bold text-violet-600 mb-2">Real Estate Works</div>
                <p className="text-sm text-muted-foreground">Seamless, intelligent, and user-focused</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <AdContainer pageType="home" position="inline" className="mb-8" />
          
          <div className="bg-gradient-to-r from-primary via-accent to-violet-500 rounded-2xl p-6 sm:p-8 lg:p-12 text-center text-white shadow-2xl">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">Category-Defining</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">AI-Powered</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">Trust-First</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Ready to Experience the Future of Real Estate?
            </h2>
            <p className="text-base sm:text-lg mb-6 sm:mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of satisfied users and discover why Agently is redefining
              how people find, rent, and manage properties.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full min-w-[200px] h-12 text-base bg-white text-primary hover:bg-white/90 shadow-lg">
                  Get Started
                </Button>
              </Link>
              <Link to="/properties" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full min-w-[200px] h-12 bg-transparent text-white border-white hover:bg-white hover:text-primary text-base shadow-lg">
                  Explore Properties
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Bottom Ad */}
      <AdContainer pageType="home" position="bottom" />
    </div>
  );
}
