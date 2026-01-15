import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Building2, Users, TrendingUp, Shield, Zap, Globe, Award } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/50 to-background">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="bg-gradient-hero text-white px-3 py-1 rounded-full text-sm font-medium">
                Category-Defining
              </span>
              <span className="bg-gradient-accent text-white px-3 py-1 rounded-full text-sm font-medium">
                AI-Powered
              </span>
              <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                Trust-First
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Agently:
              <span className="block bg-gradient-hero bg-clip-text text-transparent">
                Real Estate, Reimagined
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              A world-class digital real-estate operating system built to solve deep structural problems 
              in the Nigerian real-estate market and scale globally.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/properties">
                <Button size="lg" className="bg-gradient-hero hover:opacity-90 text-white">
                  Explore Properties
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Join the Platform
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6">
                To build the default digital infrastructure for housing across Africa and beyond, 
                where trust is built-in, rent is affordable, and real estate finally works.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border/50">
                  <Shield className="h-6 w-6 text-primary" />
                  <div>
                    <h4 className="font-semibold">Trust Built-In</h4>
                    <p className="text-sm text-muted-foreground">Every transaction, every interaction, verified and secure</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border/50">
                  <Zap className="h-6 w-6 text-accent" />
                  <div>
                    <h4 className="font-semibold">Rent Affordable</h4>
                    <p className="text-sm text-muted-foreground">Flexible payment options that work for modern life</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border/50">
                  <Globe className="h-6 w-6 text-violet-600" />
                  <div>
                    <h4 className="font-semibold">Real Estate Works</h4>
                    <p className="text-sm text-muted-foreground">Seamless, intelligent, and user-focused</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">The Agently Difference</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-lg">10x broader than competitors</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-lg">AI-powered intelligence layer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-violet-500 rounded-full"></div>
                  <span className="text-lg">Verified trust infrastructure</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-lg">Unified real-estate OS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Problem & Solution</h2>
            <p className="text-muted-foreground text-lg">How Agently transforms the real estate experience</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* The Problem */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-red-600">The Problem</h3>
              <div className="space-y-4">
                <div className="p-6 bg-red-50/50 dark:bg-red-900/20 rounded-lg border border-red-200/50">
                  <h4 className="font-semibold mb-2">Widespread Fraud & Scams</h4>
                  <p className="text-sm text-muted-foreground">Fake landlords & agents, duplicate listings, no trusted verification layer</p>
                </div>
                <div className="p-6 bg-orange-50/50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50">
                  <h4 className="font-semibold mb-2">Annual Rent Burden</h4>
                  <p className="text-sm text-muted-foreground">One-year upfront rent, financial strain on tenants, salary-rent mismatch</p>
                </div>
                <div className="p-6 bg-yellow-50/50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200/50">
                  <h4 className="font-semibold mb-2">Fragmented Process</h4>
                  <p className="text-sm text-muted-foreground">Listings on one platform, payments offline, leases manual, maintenance on WhatsApp</p>
                </div>
                <div className="p-6 bg-purple-50/50 dark:bg-purple-900/20 rounded-lg border border-purple-200/50">
                  <h4 className="font-semibold mb-2">Zero Transparency</h4>
                  <p className="text-sm text-muted-foreground">Hidden fees, no receipts, no clear cost breakdown</p>
                </div>
              </div>
            </div>

            {/* The Solution */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-green-600">The Solution</h3>
              <div className="space-y-4">
                <div className="p-6 bg-green-50/50 dark:bg-green-900/20 rounded-lg border border-green-200/50">
                  <h4 className="font-semibold mb-2">Verified Trust Infrastructure</h4>
                  <p className="text-sm text-muted-foreground">KYC + liveness checks, verified listings badge, AI fraud detection</p>
                </div>
                <div className="p-6 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50">
                  <h4 className="font-semibold mb-2">Rent-as-a-Service (RaaS)</h4>
                  <p className="text-sm text-muted-foreground">Monthly rent subscriptions, installment engine, shared rent (roommates)</p>
                </div>
                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200/50">
                  <h4 className="font-semibold mb-2">Unified Real-Estate OS</h4>
                  <p className="text-sm text-muted-foreground">Discovery → Payment → Legal → Maintenance → Analytics</p>
                </div>
                <div className="p-6 bg-violet-50/50 dark:bg-violet-900/20 rounded-lg border border-violet-200/50">
                  <h4 className="font-semibold mb-2">AI Intelligence Layer</h4>
                  <p className="text-sm text-muted-foreground">Rent prediction, tenant scoring, demand heatmaps, pricing recommendations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Opportunity */}
      <section className="py-16 bg-gradient-to-br from-background via-background/50 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Market Opportunity</h2>
            <p className="text-muted-foreground text-lg">A $100B+ global rental & property management market</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-card rounded-xl shadow-lg border border-border/50">
              <div className="text-4xl font-bold text-primary mb-4">Nigeria</div>
              <div className="text-2xl font-semibold mb-4">200M+ Population</div>
              <div className="space-y-2 text-muted-foreground">
                <div>95M+ renters</div>
                <div>Multi-billion dollar informal rental economy</div>
                <div>High smartphone penetration</div>
              </div>
            </div>

            <div className="text-center p-8 bg-card rounded-xl shadow-lg border border-border/50">
              <div className="text-4xl font-bold text-accent mb-4">Africa</div>
              <div className="text-2xl font-semibold mb-4">Rapid Urbanization</div>
              <div className="space-y-2 text-muted-foreground">
                <div>Severe housing deficits</div>
                <div>Young, tech-savvy population</div>
                <div>Massive growth potential</div>
              </div>
            </div>

            <div className="text-center p-8 bg-card rounded-xl shadow-lg border border-border/50">
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
      </section>

      {/* Technology & Innovation */}
      <section className="py-16 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Technology & Innovation</h2>
            <p className="text-muted-foreground text-lg">Built for the future of real estate</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-xl shadow-lg border border-border/50">
              <div className="w-12 h-12 bg-gradient-hero rounded-full flex items-center justify-center mb-4 mx-auto">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">AI Intelligence Layer</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Rent prediction algorithms</li>
                <li>• Tenant scoring system</li>
                <li>• Demand heatmaps</li>
                <li>• Pricing recommendations</li>
                <li>• Market insights</li>
              </ul>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-lg border border-border/50">
              <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center mb-4 mx-auto">
                <Shield className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">Verified Trust Infrastructure</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• KYC + liveness checks</li>
                <li>• Verified listings badge</li>
                <li>• AI fraud detection</li>
                <li>• Escrow services</li>
                <li>• Legal protection</li>
              </ul>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-lg border border-border/50">
              <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">Unified Real-Estate OS</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Discovery → Payment → Legal</li>
                <li>• Maintenance → Analytics</li>
                <li>• End-to-end workflow</li>
                <li>• Seamless integration</li>
                <li>• Scalable architecture</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-primary via-accent to-violet-500 rounded-2xl p-8 sm:p-12 text-center text-white shadow-2xl">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Join the Real Estate Revolution
            </h2>
            <p className="text-base sm:text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Agently is redefining how people find, rent, and manage properties. 
              Be part of the future of real estate.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="w-full min-w-[200px] h-12 text-base bg-white text-primary hover:bg-white/90 shadow-lg">
                  Get Started
                </Button>
              </Link>
              <Link to="/properties">
                <Button size="lg" variant="outline" className="w-full min-w-[200px] h-12 bg-transparent text-white border-white hover:bg-white hover:text-primary text-base shadow-lg">
                  Explore Properties
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}