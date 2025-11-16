import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import PropertyCard from '@/components/PropertyCard';
import { mockProperties } from '@/lib/mockData';
import heroImage from '@/assets/hero-apartment.jpg';

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
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
              Find Your Perfect
              <span className="block bg-gradient-hero bg-clip-text text-transparent">
                Rental Home
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 animate-slide-up">
              Discover thousands of properties, connect with trusted landlords, and manage your rental experience all in one place.
            </p>

            {/* Search Bar */}
            <div className="bg-card p-4 rounded-lg shadow-xl animate-scale-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 flex items-center gap-2 px-3 py-2 bg-background rounded-md">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="City, neighborhood, or address"
                    className="border-0 p-0 h-auto focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-md">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Move-in date"
                    className="border-0 p-0 h-auto focus-visible:ring-0"
                  />
                </div>
                <Link to="/properties" className="w-full">
                  <Button className="w-full h-full bg-gradient-hero hover:opacity-90">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-sm opacity-90">Active Listings</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5,000+</div>
              <div className="text-sm opacity-90">Happy Tenants</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">2,500+</div>
              <div className="text-sm opacity-90">Verified Landlords</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-sm opacity-90">Cities Covered</div>
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
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Agently?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Search</h3>
              <p className="text-muted-foreground">
                Advanced filters and smart search to find exactly what you're looking for
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Community</h3>
              <p className="text-muted-foreground">
                All landlords and properties are verified for your peace of mind
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Simple Management</h3>
              <p className="text-muted-foreground">
                Handle bookings, payments, and maintenance all in one platform
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-hero rounded-2xl p-12 text-center text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Find Your Next Home?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join thousands of satisfied tenants and start your journey today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="min-w-[200px]">
                  Get Started
                </Button>
              </Link>
              <Link to="/properties">
                <Button size="lg" variant="outline" className="min-w-[200px] bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  Browse Properties
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
